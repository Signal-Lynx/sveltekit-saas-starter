<!-- src/routes/(internal)/admin/+page.svelte -->
<script lang="ts">
  import { page } from "$app/stores"
  import { onMount } from "svelte"

  // ---------- Types ----------
  type DailyMRR = { day: string; mrr_cents: number }
  type MonthlyMRR = { month: string; mrr_cents: number }
  type Summary = {
    mrr_cents: number
    arr_cents: number
    active_subscriptions: number
    last_snapshot_day: string | null
    profiles_total: number
    unsubscribed_count: number
    beta_count: number
    stripe_customers: number
  }
  type StripePulse = {
    gross_paid_30d_cents: number
    gross_paid_7d_cents: number
    refunds_30d_cents: number
    net_paid_30d_cents: number
    new_customers_30d: number
    active_subscriptions: number
    new_subscriptions_30d: number
    canceled_subscriptions_30d: number
    renewals_next_7d_count: number
    open_invoices_count: number
    open_invoices_amount_cents: number
    past_due_invoices_count: number
    past_due_invoices_amount_cents: number
  }

  const SHOW_SUPABASE_MRR = false

  export let data: {
    daily: DailyMRR[]
    monthly: MonthlyMRR[]
    summary: Summary
    stripe_mode: "test" | "live"
    scope: "mapped" | "allowlist" | "all"
    allowlistCount: number
    // stripePulse is now fetched client-side
    // stripePulse?: StripePulse  // (optional if you kept the type from earlier)
  }

  let pulse: StripePulse | null = null
  let pulseLoading = true
  let pulseError: string | null = null

  // Stripe time-series (last N months)
  type StripeTimeseries = {
    months: string[]
    gross_cents: number[]
    refunds_cents: number[]
    net_paid_cents: number[]
    new_customers: number[]
    active_subs: number[]
    cancellations: number[]
  }
  let ts: StripeTimeseries | null = null
  let tsLoading = true
  let tsError: string | null = null

  $: pseudoMRRCents = pulse?.net_paid_30d_cents ?? 0
  $: pseudoARRCents = pseudoMRRCents * 12

  onMount(async () => {
    try {
      // Ask server for fresh data and new semantics for active/cancel series
      const params = new URLSearchParams({
        months: "12",
        refresh: "1", // bypass in-proc cache
        active_mode: "any", // any overlap within month
        cancellation_mode: "requested", // show when the cancel was initiated
        debug: "1", // surface server-side samples (remove later)
      })

      const [p, t] = await Promise.all([
        fetch("/api/admin/stripe-pulse"),
        fetch(`/api/admin/stripe-timeseries?${params.toString()}`),
      ])

      if (!p.ok) throw new Error(`Pulse HTTP ${p.status}`)
      if (!t.ok) throw new Error(`Timeseries HTTP ${t.status}`)

      pulse = await p.json()
      ts = await t.json()

      // If the endpoint had to return zeros due to missing secret, surface it
      if (ts && (ts as any)._debug === "no_stripe_secret_found") {
        tsError =
          "Stripe timeseries unavailable (no Stripe secret visible to the website process)."
      }

      // Defensive units guard: if net_paid looks like dollars (<$20 typical) while pulse shows $$,
      // treat timeseries values as dollars and convert to cents.
      if (ts) {
        const maxNet = Math.max(...(ts.net_paid_cents ?? [0]))
        const pulseNet = pulse?.net_paid_30d_cents ?? 0
        if (
          Number.isFinite(maxNet) &&
          maxNet > 0 &&
          maxNet < 2000 &&
          pulseNet > 5000
        ) {
          ts.gross_cents = (ts.gross_cents ?? []).map((v: number) =>
            Math.round((v ?? 0) * 100),
          )
          ts.refunds_cents = (ts.refunds_cents ?? []).map((v: number) =>
            Math.round((v ?? 0) * 100),
          )
          ts.net_paid_cents = (ts.net_paid_cents ?? []).map((v: number) =>
            Math.round((v ?? 0) * 100),
          )
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load Stripe data"
      if (String(msg).toLowerCase().includes("pulse")) {
        pulseError = msg
      } else if (String(msg).toLowerCase().includes("timeseries")) {
        tsError = msg
      } else {
        pulseError = msg
        tsError = msg
      }
    } finally {
      pulseLoading = false
      tsLoading = false
    }
  })

  // ---------- Formatters ----------
  const fmtUSD0 = (cents: number) =>
    "$" +
    ((cents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
  const fmtInt = (n: number) => (n ?? 0).toLocaleString()

  // ---------- Tiny helpers ----------
  function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n)
  }
  function linePath(points: Array<{ x: number; y: number }>) {
    if (!points.length) return ""
    return points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")
  }

  // ---------- Chart builder ----------
  function makeChart(
    series: Array<{ label: string; value: number }>,
    opts?: { height?: number; width?: number },
  ) {
    const width = Math.max(100, opts?.width ?? 760)
    const height = Math.max(80, opts?.height ?? 220)
    const m = { t: 16, r: 16, b: 28, l: 48 }
    const w = Math.max(1, width - m.l - m.r)
    const h = Math.max(1, height - m.t - m.b)

    // Sanitize series, keeping label but dropping non-finite values
    const clean = series
      .map((d) => ({
        label: d.label,
        value: isFiniteNumber(d.value) ? d.value : 0,
      }))
      .filter((d) => d.label != null)

    if (!clean.length) {
      return {
        width,
        height,
        m,
        w,
        h,
        path: "",
        // Ensure consistent shape so {#each chart.points} is always iterable & typed
        points: [] as Array<{ x: number; y: number }>,
        yTicks: [] as Array<{ y: number; v: number }>,
        xTicks: [] as Array<{ x: number; label: string }>,
        yMin: 0,
        yMax: 1,
      }
    }

    const yVals = clean.map((d) => d.value)
    const rawMin = Math.min(...yVals)
    const rawMax = Math.max(...yVals)
    const yMin = Math.min(0, rawMin)
    const yMax = Math.max(1, rawMax)
    const span = Math.max(1, yMax - yMin)

    const xStep = clean.length > 1 ? w / (clean.length - 1) : 0
    const points = clean.map((d, i) => {
      const x = m.l + i * xStep
      const y = m.t + (h - ((d.value - yMin) / span) * h)
      return { x, y }
    })

    const yTicks: Array<{ y: number; v: number }> = []
    const TICKS = 4
    for (let i = 0; i <= TICKS; i++) {
      const v = yMin + (i / TICKS) * span
      const y = m.t + (h - ((v - yMin) / span) * h)
      yTicks.push({ y, v })
    }

    const xTicks = clean.map((d, i) => ({
      x: m.l + i * xStep,
      label: d.label,
    }))

    return {
      width,
      height,
      m,
      w,
      h,
      path: linePath(points),
      points,
      yTicks,
      xTicks,
      yMin,
      yMax,
    }
  }

  // ---------- Data -> series ----------
  const dailySeries = data.daily.map((d) => ({
    label: (d.day || "").slice(5),
    value: Number(d.mrr_cents) || 0,
  }))
  const monthlySeries = data.monthly.map((d) => ({
    label: d.month,
    value: Number(d.mrr_cents) || 0,
  }))

  const dailyChart = makeChart(dailySeries)
  const monthlyChart = makeChart(monthlySeries)

  // Sparser x-labels for long series, but never 0
  const monthlyLabelStep = Math.max(
    1,
    Math.ceil((monthlySeries.length || 1) / 6),
  )
  const dailyLabelStep = Math.max(1, Math.ceil((dailySeries.length || 1) / 6))

  // ---------- Stripe timeseries -> series (reactive) ----------
  $: tsNetSeries = (ts?.months ?? []).map((m, i) => ({
    label: m,
    value: Number(ts?.net_paid_cents?.[i] ?? 0),
  }))
  $: tsNewCustSeries = (ts?.months ?? []).map((m, i) => ({
    label: m,
    value: Number(ts?.new_customers?.[i] ?? 0),
  }))
  // NEW series
  $: tsActiveSeries = (ts?.months ?? []).map((m, i) => ({
    label: m,
    value: Number(ts?.active_subs?.[i] ?? 0),
  }))
  $: tsCancelSeries = (ts?.months ?? []).map((m, i) => ({
    label: m,
    value: Number(ts?.cancellations?.[i] ?? 0),
  }))

  $: tsNetChart = makeChart(tsNetSeries)
  $: tsNewCustChart = makeChart(tsNewCustSeries)
  // NEW charts
  $: tsActiveChart = makeChart(tsActiveSeries)
  $: tsCancelChart = makeChart(tsCancelSeries)

  $: tsLabelStep = Math.max(1, Math.ceil((tsNetSeries.length || 1) / 6))
</script>

{#if $page.url.searchParams.get("ok")}
  <div
    class="mb-4 rounded border alert alert-success px-3 py-2 text-sm"
    role="status"
    aria-live="polite"
  >
    {$page.url.searchParams.get("ok")}
  </div>
{/if}

<h1 class="text-2xl font-semibold mb-4">Admin Dashboard</h1>

<!-- Customer Database (Supabase) -->
<h2 class="text-lg font-semibold mb-2">Customer Database (Supabase)</h2>
<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4">
  <div class="border rounded p-3">
    <div class="text-xs text-base-content/50">Active subs</div>
    <div class="text-xl font-semibold">
      {fmtInt(data.summary.active_subscriptions)}
    </div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs text-base-content/50">Customers</div>
    <div class="text-xl font-semibold">
      {fmtInt(data.summary.profiles_total)}
    </div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs text-base-content/50">Unsubscribed</div>
    <div class="text-xl font-semibold">
      {fmtInt(data.summary.unsubscribed_count)}
    </div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs text-base-content/50">Beta testers</div>
    <div class="text-xl font-semibold">{fmtInt(data.summary.beta_count)}</div>
  </div>
</div>

<!-- Admin-only control kept hidden; endpoint remains available -->
<!--
<div class="mb-4 flex flex-wrap items-center gap-3">
  <form method="POST" action="?/refresh_mrr">
    <button class="btn btn-outline">Refresh MRR now</button>
  </form>
</div>
-->

<!-- Stripe Pulse -->
<div class="border rounded p-4 mb-6">
  <div class="font-semibold mb-1">Stripe Pulse (last 30 days)</div>
  <div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
    <span class="badge badge-outline">Stripe: {data.stripe_mode}</span>
    <span class="badge badge-outline">Scope: {data.scope}</span>
    {#if data.summary.last_snapshot_day}
      <span class="badge badge-outline"
        >Last snapshot: {data.summary.last_snapshot_day}</span
      >
    {/if}
    {#if data.scope === "allowlist"}
      <span class="text-base-content/60"
        >(price IDs: {data.allowlistCount})</span
      >
    {/if}
  </div>

  {#if pulseLoading}
    <div class="text-base-content/60 text-sm">Loading Stripe data…</div>
  {:else if pulseError}
    <div class="rounded border alert alert-warning px-3 py-2 text-xs">
      {pulseError}
    </div>
  {:else if pulse}
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Gross paid (30d)</div>
        <div class="text-xl font-semibold">
          {fmtUSD0(pulse.gross_paid_30d_cents ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Refunds (30d)</div>
        <div class="text-xl font-semibold">
          {fmtUSD0(pulse.refunds_30d_cents ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Net paid (30d)</div>
        <div class="text-xl font-semibold">
          {fmtUSD0(pulse.net_paid_30d_cents ?? 0)}
        </div>
      </div>

      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Active subs</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.active_subscriptions ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">New subs (30d)</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.new_subscriptions_30d ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Canceled (30d)</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.canceled_subscriptions_30d ?? 0)}
        </div>
      </div>

      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">New customers (30d)</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.new_customers_30d ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Renewals (next 7d)</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.renewals_next_7d_count ?? 0)}
        </div>
      </div>

      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Open invoices</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.open_invoices_count ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Open amount</div>
        <div class="text-xl font-semibold">
          {fmtUSD0(pulse.open_invoices_amount_cents ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Past-due invoices</div>
        <div class="text-xl font-semibold">
          {fmtInt(pulse.past_due_invoices_count ?? 0)}
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Past-due amount</div>
        <div class="text-xl font-semibold">
          {fmtUSD0(pulse.past_due_invoices_amount_cents ?? 0)}
        </div>
      </div>
    </div>
  {:else}
    <div class="text-base-content/60 text-sm">No Stripe data.</div>
  {/if}
</div>

<!-- Pseudo MRR / ARR (Stripe-derived) -->
{#if pulse}
  <div class="border rounded p-4 mb-6">
    <div class="font-semibold mb-2">Pseudo MRR / ARR (rolling 30 days)</div>

    <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-2 mb-2">
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Pseudo-MRR (30d net)</div>
        <div class="text-xl font-semibold">{fmtUSD0(pseudoMRRCents)}</div>
      </div>
      <div class="border rounded p-3">
        <div class="text-xs text-base-content/50">Pseudo-ARR (×12)</div>
        <div class="text-xl font-semibold">{fmtUSD0(pseudoARRCents)}</div>
      </div>
    </div>

    <p class="text-xs text-base-content/60">
      Estimated from last 30 days net paid in Stripe (refunds subtracted). May
      include one-time or non-recurring payments.
    </p>
  </div>
{/if}

<!-- Stripe Net Paid — last 12 months -->
<div class="border rounded p-4 mb-6">
  <div class="font-semibold mb-2">Stripe Net Paid — last 12 months</div>
  {#if tsLoading}
    <div class="text-base-content/60 text-sm">Loading time-series…</div>
  {:else if tsError}
    <div class="rounded border alert alert-warning px-3 py-2 text-xs">
      {tsError}
    </div>
  {:else if tsNetSeries.length === 0}
    <div class="text-base-content/70">No data yet</div>
  {:else}
    <svg
      width={tsNetChart.width}
      height={tsNetChart.height}
      viewBox={`0 0 ${tsNetChart.width} ${tsNetChart.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="max-w-full"
      role="img"
      aria-labelledby="stripe-net-12m-title stripe-net-12m-desc"
    >
      <title id="stripe-net-12m-title">Stripe Net Paid — last 12 months</title>
      <desc id="stripe-net-12m-desc"
        >Net paid (gross minus refunds) per month.</desc
      >

      {#each tsNetChart.yTicks as t, _yi (t.y)}
        <line
          x1={tsNetChart.m.l}
          x2={tsNetChart.m.l + tsNetChart.w}
          y1={t.y}
          y2={t.y}
          class="stroke-base-content/20"
          shape-rendering="crispEdges"
          vector-effect="non-scaling-stroke"
        />
        <text
          x={tsNetChart.m.l - 8}
          y={t.y}
          text-anchor="end"
          alignment-baseline="middle"
          class="fill-base-content/60 text-xs"
        >
          {fmtUSD0(t.v)}
        </text>
      {/each}

      {#each tsNetChart.xTicks as t, i (i)}
        {#if i % tsLabelStep === 0}
          <text
            x={t.x}
            y={tsNetChart.height - 6}
            text-anchor="middle"
            class="fill-base-content/60 text-xs"
          >
            {t.label}
          </text>
        {/if}
      {/each}

      {#if tsNetChart.path}
        <path
          d={tsNetChart.path}
          fill="none"
          stroke="currentColor"
          class="stroke-info"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      {#each tsNetChart.points as p}
        <circle cx={p.x} cy={p.y} r="2" class="fill-info" />
      {/each}
    </svg>

    <p class="mt-2 text-xs text-base-content/60">
      Net = paid invoices − refunds in the same month. In <code>allowlist</code>
      scope, an invoice contributes if any line matches an allowed product/price
      (approximation).
    </p>
  {/if}
</div>

<!-- New Customers — last 12 months -->
<div class="border rounded p-4 mb-6">
  <div class="font-semibold mb-2">New Customers — last 12 months</div>
  {#if tsLoading}
    <div class="text-base-content/60 text-sm">Loading time-series…</div>
  {:else if tsError}
    <div class="rounded border alert alert-warning px-3 py-2 text-xs">
      {tsError}
    </div>
  {:else if tsNewCustSeries.length === 0}
    <div class="text-base-content/70">No data yet</div>
  {:else}
    <svg
      width={tsNewCustChart.width}
      height={tsNewCustChart.height}
      viewBox={`0 0 ${tsNewCustChart.width} ${tsNewCustChart.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="max-w-full"
      role="img"
      aria-labelledby="stripe-newcust-12m-title stripe-newcust-12m-desc"
    >
      <title id="stripe-newcust-12m-title">New Customers — last 12 months</title
      >
      <desc id="stripe-newcust-12m-desc"
        >Count of newly created Stripe customers per month.</desc
      >

      {#each tsNewCustChart.yTicks as t, _yi (t.y)}
        <line
          x1={tsNewCustChart.m.l}
          x2={tsNewCustChart.m.l + tsNewCustChart.w}
          y1={t.y}
          y2={t.y}
          class="stroke-base-content/20"
          shape-rendering="crispEdges"
          vector-effect="non-scaling-stroke"
        />
        <text
          x={tsNewCustChart.m.l - 8}
          y={t.y}
          text-anchor="end"
          alignment-baseline="middle"
          class="fill-base-content/60 text-xs"
        >
          {fmtInt(t.v)}
        </text>
      {/each}

      {#each tsNewCustChart.xTicks as t, i (i)}
        {#if i % tsLabelStep === 0}
          <text
            x={t.x}
            y={tsNewCustChart.height - 6}
            text-anchor="middle"
            class="fill-base-content/60 text-xs"
          >
            {t.label}
          </text>
        {/if}
      {/each}

      {#if tsNewCustChart.path}
        <path
          d={tsNewCustChart.path}
          fill="none"
          stroke="currentColor"
          class="stroke-secondary"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      {#each tsNewCustChart.points as p}
        <circle cx={p.x} cy={p.y} r="2" class="fill-secondary" />
      {/each}
    </svg>
  {/if}
</div>

<!-- Active Subs — last 12 months -->
<div class="border rounded p-4 mb-6">
  <div class="font-semibold mb-2">Active Subs — last 12 months</div>
  {#if tsLoading}
    <div class="text-base-content/60 text-sm">Loading time-series…</div>
  {:else if tsError}
    <div class="rounded border alert alert-warning px-3 py-2 text-xs">
      {tsError}
    </div>
  {:else if tsActiveSeries.length === 0}
    <div class="text-base-content/70">No data yet</div>
  {:else}
    <svg
      width={tsActiveChart.width}
      height={tsActiveChart.height}
      viewBox={`0 0 ${tsActiveChart.width} ${tsActiveChart.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="max-w-full"
      role="img"
      aria-labelledby="stripe-active-12m-title stripe-active-12m-desc"
    >
      <title id="stripe-active-12m-title">Active Subs — last 12 months</title>
      <desc id="stripe-active-12m-desc"
        >Subscriptions active at any time within each month.</desc
      >

      {#each tsActiveChart.yTicks as t, _yi (t.y)}
        <line
          x1={tsActiveChart.m.l}
          x2={tsActiveChart.m.l + tsActiveChart.w}
          y1={t.y}
          y2={t.y}
          class="stroke-base-content/20"
          shape-rendering="crispEdges"
          vector-effect="non-scaling-stroke"
        />
        <text
          x={tsActiveChart.m.l - 8}
          y={t.y}
          text-anchor="end"
          alignment-baseline="middle"
          class="fill-base-content/60 text-xs"
        >
          {fmtInt(t.v)}
        </text>
      {/each}

      {#each tsActiveChart.xTicks as t, i (i)}
        {#if i % tsLabelStep === 0}
          <text
            x={t.x}
            y={tsActiveChart.height - 6}
            text-anchor="middle"
            class="fill-base-content/60 text-xs"
          >
            {t.label}
          </text>
        {/if}
      {/each}

      {#if tsActiveChart.path}
        <path
          d={tsActiveChart.path}
          fill="none"
          stroke="currentColor"
          class="stroke-info"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      {#each tsActiveChart.points as p}
        <circle cx={p.x} cy={p.y} r="2" class="fill-info" />
      {/each}
    </svg>

    <p class="mt-2 text-xs text-base-content/60">
      Count of subscriptions considered active at each month’s end
      (trialing/past_due included).
    </p>
  {/if}
</div>

<!-- Cancellations — last 12 months -->
<div class="border rounded p-4 mb-6">
  <div class="font-semibold mb-2">Cancellations — last 12 months</div>
  {#if tsLoading}
    <div class="text-base-content/60 text-sm">Loading time-series…</div>
  {:else if tsError}
    <div class="rounded border alert alert-warning px-3 py-2 text-xs">
      {tsError}
    </div>
  {:else if tsCancelSeries.length === 0}
    <div class="text-base-content/70">No data yet</div>
  {:else}
    <svg
      width={tsCancelChart.width}
      height={tsCancelChart.height}
      viewBox={`0 0 ${tsCancelChart.width} ${tsCancelChart.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="max-w-full"
      role="img"
      aria-labelledby="stripe-cancel-12m-title stripe-cancel-12m-desc"
    >
      <title id="stripe-cancel-12m-title">Cancellations — last 12 months</title>
      <desc id="stripe-cancel-12m-desc"
        >Subscriptions with a cancellation recorded in each month (<code
          >canceled_at</code
        >, <code>ended_at</code>, or scheduled
        <code>cancel_at</code> when cancel-at-period-end is enabled).</desc
      >

      {#each tsCancelChart.yTicks as t, _yi (t.y)}
        <line
          x1={tsCancelChart.m.l}
          x2={tsCancelChart.m.l + tsCancelChart.w}
          y1={t.y}
          y2={t.y}
          class="stroke-base-content/20"
          shape-rendering="crispEdges"
          vector-effect="non-scaling-stroke"
        />
        <text
          x={tsCancelChart.m.l - 8}
          y={t.y}
          text-anchor="end"
          alignment-baseline="middle"
          class="fill-base-content/60 text-xs"
        >
          {fmtInt(t.v)}
        </text>
      {/each}

      {#each tsCancelChart.xTicks as t, i (i)}
        {#if i % tsLabelStep === 0}
          <text
            x={t.x}
            y={tsCancelChart.height - 6}
            text-anchor="middle"
            class="fill-base-content/60 text-xs"
          >
            {t.label}
          </text>
        {/if}
      {/each}

      {#if tsCancelChart.path}
        <path
          d={tsCancelChart.path}
          fill="none"
          stroke="currentColor"
          class="stroke-secondary"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      {#each tsCancelChart.points as p}
        <circle cx={p.x} cy={p.y} r="2" class="fill-secondary" />
      {/each}
    </svg>

    <p class="mt-2 text-xs text-base-content/60">
      Count of subscriptions whose <code>canceled_at</code> falls within each month.
    </p>
  {/if}
</div>

{#if SHOW_SUPABASE_MRR}
  <!-- Monthly MRR (last 12 months) -->
  <div class="border rounded p-4 mb-6">
    <div class="font-semibold mb-2">MRR (month-to-month)</div>
    {#if monthlySeries.length === 0}
      <div class="text-base-content/70">No data yet</div>
    {:else}
      <svg
        width={monthlyChart.width}
        height={monthlyChart.height}
        viewBox={`0 0 ${monthlyChart.width} ${monthlyChart.height}`}
        preserveAspectRatio="xMidYMid meet"
        class="max-w-full"
        role="img"
        aria-labelledby="mrr-monthly-title mrr-monthly-desc"
      >
        <title id="mrr-monthly-title">Monthly MRR</title>
        <desc id="mrr-monthly-desc">
          Line chart of monthly recurring revenue over the last 12 months.
        </desc>

        {#each monthlyChart.yTicks as t, _yi (t.y)}
          <line
            x1={monthlyChart.m.l}
            x2={monthlyChart.m.l + monthlyChart.w}
            y1={t.y}
            y2={t.y}
            class="stroke-base-content/20"
            shape-rendering="crispEdges"
            vector-effect="non-scaling-stroke"
          />
          <text
            x={monthlyChart.m.l - 8}
            y={t.y}
            text-anchor="end"
            alignment-baseline="middle"
            class="fill-base-content/60 text-xs"
          >
            {fmtUSD0(t.v)}
          </text>
        {/each}

        {#each monthlyChart.xTicks as t, i (i)}
          {#if i % monthlyLabelStep === 0}
            <text
              x={t.x}
              y={monthlyChart.height - 6}
              text-anchor="middle"
              class="fill-base-content/60 text-xs"
            >
              {t.label}
            </text>
          {/if}
        {/each}

        {#if monthlyChart.path}
          <path
            d={monthlyChart.path}
            fill="none"
            stroke="currentColor"
            class="stroke-info"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}

        {#each monthlyChart.points as p}
          <circle cx={p.x} cy={p.y} r="2" class="fill-info" />
        {/each}
      </svg>
    {/if}
  </div>

  <!-- Daily MRR (last 90 days) -->
  <div class="border rounded p-4">
    <div class="font-semibold mb-2">MRR (daily – last 90 days)</div>
    {#if dailySeries.length === 0}
      <div class="text-base-content/70">No data yet</div>
    {:else}
      <svg
        width={dailyChart.width}
        height={dailyChart.height}
        viewBox={`0 0 ${dailyChart.width} ${dailyChart.height}`}
        preserveAspectRatio="xMidYMid meet"
        class="max-w-full"
        role="img"
        aria-labelledby="mrr-daily-title mrr-daily-desc"
      >
        <title id="mrr-daily-title">Daily MRR (90 days)</title>
        <desc id="mrr-daily-desc">
          Line chart of daily recurring revenue over the last ninety days.
        </desc>

        {#each dailyChart.yTicks as t, _yi (t.y)}
          <line
            x1={dailyChart.m.l}
            x2={dailyChart.m.l + dailyChart.w}
            y1={t.y}
            y2={t.y}
            class="stroke-base-content/20"
            shape-rendering="crispEdges"
            vector-effect="non-scaling-stroke"
          />
          <text
            x={dailyChart.m.l - 8}
            y={t.y}
            text-anchor="end"
            alignment-baseline="middle"
            class="fill-base-content/60 text-xs"
          >
            {fmtUSD0(t.v)}
          </text>
        {/each}

        {#each dailyChart.xTicks as t, i (i)}
          {#if i % dailyLabelStep === 0}
            <text
              x={t.x}
              y={dailyChart.height - 6}
              text-anchor="middle"
              class="fill-base-content/60 text-xs"
            >
              {t.label}
            </text>
          {/if}
        {/each}

        {#if dailyChart.path}
          <path
            d={dailyChart.path}
            fill="none"
            stroke="currentColor"
            class="stroke-success"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}

        {#each dailyChart.points as p}
          <circle cx={p.x} cy={p.y} r="2" class="fill-success" />
        {/each}
      </svg>
    {/if}
  </div>
{/if}
