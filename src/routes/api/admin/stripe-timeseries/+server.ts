// FILE: src/routes/api/admin/stripe-timeseries/+server.ts
import type { RequestHandler } from "./$types"
import { error } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import Stripe from "stripe"

// -----------------------------
// Config / Helpers
// -----------------------------
const API_VERSION: Stripe.LatestApiVersion = "2023-08-16"
const CACHE_TTL_MS = 240 * 60_000 // 4 hour cache

type TSResponse = {
  months: string[]
  gross_cents: number[]
  refunds_cents: number[]
  net_paid_cents: number[]
  new_customers: number[]
  active_subs: number[] // EOM snapshot by default; switchable via ?active_mode=any
  cancellations: number[] // per-month cancels (all types grouped, de-duped)
  _debug_used_secret_name?: string
  _debug_mode?: "test" | "live" | "unknown"
  _debug?: string // "balance_transactions" | "invoices_refunds_customers" | "no_stripe_secret_found"

  // --- NEW: only present when &debug=1 is passed ---
  _debug_window?: {
    gte_iso: string
    lt_iso: string
    active_mode: "eom" | "any"
    cancellation_mode: "effective" | "requested"
  }
  _debug_active_samples?: Array<{
    id: string
    start_iso: string
    end_iso: string
    months_counted: string[]
  }>
  _debug_cancel_effective_samples?: Array<{
    id: string
    candidates_iso: {
      canceled_at?: string
      ended_at?: string
      cancel_at?: string
    }
    months_effective: string[]
  }>
  _debug_cancel_requested_samples?: Array<{
    sub_id: string
    kind: "deleted" | "updated"
    event_iso: string
    month: string
  }>
}

// simple in-memory cache (per server instance)
const cache = new Map<string, { at: number; data: TSResponse }>()

function pickStripeSecret():
  | { key: string; name: string }
  | { key: ""; name: "" } {
  const candidates = [
    "PRIVATE_STRIPE_API_KEY", // primary
    "PRIVATE_STRIPE_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_API_KEY",
    "STRIPE_SECRET",
    "STRIPE_KEY",
    "PRIVATE_STRIPE_KEY",
  ] as const

  for (const name of candidates) {
    const v = env[name]
    if (v && v.trim()) return { key: v, name }
  }
  return { key: "", name: "" }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function monthKeyUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  return `${y}-${String(m).padStart(2, "0")}`
}

function firstOfMonthUTC(y: number, mZeroBased: number): Date {
  return new Date(Date.UTC(y, mZeroBased, 1, 0, 0, 0, 0))
}

function addMonthsUTC(d: Date, delta: number): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  return new Date(Date.UTC(y, m + delta, 1, 0, 0, 0, 0))
}

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000)
}

function buildMonthBuckets(nMonths: number): {
  labels: string[]
  idx: Map<string, number>
  start: Date
  end: Date
  monthStartsSec: number[] // inclusive boundary for each month
  monthEndsSec: number[] // EOM timestamps (exclusive boundary)
} {
  const now = new Date()
  const firstOfThisMonth = firstOfMonthUTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
  )
  const start = addMonthsUTC(firstOfThisMonth, -(nMonths - 1))
  const end = addMonthsUTC(firstOfThisMonth, 1) // first of next month (exclusive)

  const labels: string[] = []
  const idx = new Map<string, number>()
  const monthEndsSec: number[] = []
  const monthStartsSec: number[] = []

  for (let i = 0; i < nMonths; i++) {
    const d = addMonthsUTC(start, i)
    const k = monthKeyUTC(d)
    idx.set(k, i)
    labels.push(k)

    monthStartsSec.push(toUnixSeconds(d))
    const eom = addMonthsUTC(start, i + 1)
    monthEndsSec.push(toUnixSeconds(eom))
  }

  return { labels, idx, start, end, monthStartsSec, monthEndsSec }
}

function labelForTimestamp(idx: Map<string, number>, ts: number): number | -1 {
  const d = new Date(ts * 1000)
  const key = monthKeyUTC(d)
  const i = idx.get(key)
  return typeof i === "number" ? i : -1
}

// -----------------------------
// Fast-path collectors (Balance Transactions) + fallbacks
// -----------------------------
async function collectUsingBalanceTransactions(
  stripe: Stripe,
  monthsParam: number,
  _labels: string[],
  idx: Map<string, number>,
  gte: number,
  lt: number,
) {
  const gross = Array<number>(monthsParam).fill(0)
  const refunds = Array<number>(monthsParam).fill(0)

  // Charges (gross)
  const charges = stripe.balanceTransactions.list({
    created: { gte, lt },
    type: "charge",
    limit: 100,
  })
  for await (const bt of charges) {
    const created = typeof bt.created === "number" ? bt.created : 0
    const i = labelForTimestamp(idx, created)
    if (i === -1) continue
    const amount = typeof bt.amount === "number" ? bt.amount : 0 // cents
    gross[i] += amount
  }

  // Refunds (amount is negative in balance tx; use magnitude)
  const refundBts = stripe.balanceTransactions.list({
    created: { gte, lt },
    type: "refund",
    limit: 100,
  })
  for await (const bt of refundBts) {
    const created = typeof bt.created === "number" ? bt.created : 0
    const i = labelForTimestamp(idx, created)
    if (i === -1) continue
    const amount = typeof bt.amount === "number" ? bt.amount : 0
    refunds[i] += Math.abs(amount)
  }

  return { gross, refunds }
}

async function collectUsingInvoicesRefundsCustomers(
  stripe: Stripe,
  monthsParam: number,
  _labels: string[],
  idx: Map<string, number>,
  gte: number,
  lt: number,
) {
  const gross = Array<number>(monthsParam).fill(0)
  const refunds = Array<number>(monthsParam).fill(0)
  const newCust = Array<number>(monthsParam).fill(0)

  await Promise.all([
    (async () => {
      const list = stripe.invoices.list({
        status: "paid",
        created: { gte, lt },
        limit: 100,
      })
      for await (const inv of list) {
        const created = typeof inv.created === "number" ? inv.created : 0
        const i = labelForTimestamp(idx, created)
        if (i === -1) continue
        const amount = typeof inv.total === "number" ? inv.total : 0
        gross[i] += amount
      }
    })(),
    (async () => {
      const list = stripe.refunds.list({ created: { gte, lt }, limit: 100 })
      for await (const r of list) {
        const created = typeof r.created === "number" ? r.created : 0
        const i = labelForTimestamp(idx, created)
        if (i === -1) continue
        const amount = typeof r.amount === "number" ? r.amount : 0
        refunds[i] += amount
      }
    })(),
    (async () => {
      const list = stripe.customers.list({ created: { gte, lt }, limit: 100 })
      for await (const c of list) {
        const created = typeof c.created === "number" ? c.created : 0
        const i = labelForTimestamp(idx, created)
        if (i === -1) continue
        newCust[i] += 1
      }
    })(),
  ])

  return { gross, refunds, newCust }
}

// -----------------------------
// Handler
// -----------------------------
export const GET: RequestHandler = async ({ url, locals }) => {
  // --- SECURITY CHECK START ---
  if (!locals.user) throw error(401, "Unauthorized")

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", locals.user.id)
    .single()

  if (!data?.is_admin) throw error(403, "Forbidden")
  // --- SECURITY CHECK END ---

  const monthsParam = clamp(
    Number(url.searchParams.get("months") ?? 12) || 12,
    1,
    24,
  )

  const cancelMode = (
    url.searchParams.get("cancellation_mode") || ""
  ).toLowerCase()
  const activeModeRaw = (
    url.searchParams.get("active_mode") || ""
  ).toLowerCase()
  const activeMode: "eom" | "any" =
    activeModeRaw === "any" || activeModeRaw === "anytime" ? "any" : "eom"

  const debug = url.searchParams.has("debug")
  const force = url.searchParams.has("refresh") || debug
  const cacheKey = `ts:${monthsParam}:${cancelMode || "effective"}:${activeMode}`
  const cached = cache.get(cacheKey)
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "content-type": "application/json" },
    })
  }

  const { key: secret, name: secretName } = pickStripeSecret()
  const { labels, idx, start, end, monthStartsSec, monthEndsSec } =
    buildMonthBuckets(monthsParam)

  if (!secret) {
    const zero: TSResponse = {
      months: labels,
      gross_cents: Array(monthsParam).fill(0),
      refunds_cents: Array(monthsParam).fill(0),
      net_paid_cents: Array(monthsParam).fill(0),
      new_customers: Array(monthsParam).fill(0),
      active_subs: Array(monthsParam).fill(0),
      cancellations: Array(monthsParam).fill(0),
      _debug: "no_stripe_secret_found",
      _debug_mode: "unknown",
      ...(debug
        ? {
            _debug_window: {
              gte_iso: new Date(toUnixSeconds(start) * 1000).toISOString(),
              lt_iso: new Date(toUnixSeconds(end) * 1000).toISOString(),
              active_mode: activeMode,
              cancellation_mode:
                cancelMode === "requested" ? "requested" : "effective",
            },
          }
        : {}),
    }
    // don't cache the "no secret" result if debug requested
    if (!debug) cache.set(cacheKey, { at: Date.now(), data: zero })
    return new Response(JSON.stringify(zero), {
      headers: { "content-type": "application/json" },
    })
  }

  const stripe = new Stripe(secret, { apiVersion: API_VERSION })
  const keyMode: "test" | "live" | "unknown" = secret.startsWith("sk_test_")
    ? "test"
    : secret.startsWith("sk_live_")
      ? "live"
      : "unknown"

  const gte = toUnixSeconds(start)
  const lt = toUnixSeconds(end)

  let gross = Array<number>(monthsParam).fill(0)
  let refunds = Array<number>(monthsParam).fill(0)
  let newCust = Array<number>(monthsParam).fill(0)
  let usedFastPath = false

  // Try FAST path for revenue via balance transactions
  try {
    const fast = await collectUsingBalanceTransactions(
      stripe,
      monthsParam,
      labels,
      idx,
      gte,
      lt,
    )
    gross = fast.gross
    refunds = fast.refunds
    usedFastPath = true
  } catch {
    // fall back
  }

  if (!usedFastPath) {
    try {
      const slow = await collectUsingInvoicesRefundsCustomers(
        stripe,
        monthsParam,
        labels,
        idx,
        gte,
        lt,
      )
      gross = slow.gross
      refunds = slow.refunds
      newCust = slow.newCust
    } catch {
      // leave zeros
    }
  } else {
    // Fast path still needs new customers
    try {
      const list = stripe.customers.list({ created: { gte, lt }, limit: 100 })
      for await (const c of list) {
        const created = typeof c.created === "number" ? c.created : 0
        const i = labelForTimestamp(idx, created)
        if (i === -1) continue
        newCust[i] += 1
      }
    } catch {
      // ignore
    }
  }

  // --- Active Subs (EOM snapshot counts by default; "any" counts overlap in month) ---
  const activeSubs = Array<number>(monthsParam).fill(0)
  const debugActiveSamples: Array<{
    id: string
    start_iso: string
    end_iso: string
    months_counted: string[]
  }> = []
  try {
    // include canceled subs too so historical snapshots are accurate
    const subs = stripe.subscriptions.list({ status: "all", limit: 100 })
    for await (const s of subs) {
      // Use the *earliest* known start so we don't delay the first visible month.
      const createdSec = typeof s.created === "number" ? s.created : 0
      // `start_date` may be later than `created` depending on anchoring/backdating.
      const startDateSec =
        typeof (s as any).start_date === "number" ? (s as any).start_date : 0
      const startCandidates = [createdSec, startDateSec].filter((v) => v > 0)
      const startSec =
        (startCandidates.length ? Math.min(...startCandidates) : createdSec) ||
        0

      const endCandidates = [s.canceled_at, s.ended_at, s.cancel_at].filter(
        (x): x is number => typeof x === "number" && x > 0,
      )
      const endSec = endCandidates.length
        ? Math.min(...endCandidates)
        : Number.POSITIVE_INFINITY

      const counted: string[] = []
      for (let i = 0; i < monthsParam; i++) {
        const monthStart = monthStartsSec[i]
        const monthEnd = monthEndsSec[i]

        if (activeMode === "eom") {
          // Count if active strictly across the end-of-month boundary
          if (startSec < monthEnd && endSec > monthEnd) {
            activeSubs[i] += 1
            counted.push(labels[i])
          }
        } else {
          // "any" overlap within the calendar month
          // interval overlap: [startSec, endSec) intersects [monthStart, monthEnd)
          if (startSec < monthEnd && endSec > monthStart) {
            activeSubs[i] += 1
            counted.push(labels[i])
          }
        }
      }

      if (debug && debugActiveSamples.length < 10) {
        debugActiveSamples.push({
          id: String(s.id ?? ""),
          start_iso: new Date(startSec * 1000).toISOString(),
          end_iso:
            endSec === Number.POSITIVE_INFINITY
              ? "∞"
              : new Date(endSec * 1000).toISOString(),
          months_counted: counted,
        })
      }
    }
  } catch {
    // leave zeros
  }

  // --- Cancellations per month (group all types, de-dupe per subscription/month) ---
  const cancellations = Array<number>(monthsParam).fill(0)
  const debugCancelEffectiveSamples: Array<{
    id: string
    candidates_iso: {
      canceled_at?: string
      ended_at?: string
      cancel_at?: string
    }
    months_effective: string[]
  }> = []
  try {
    const subs = stripe.subscriptions.list({ status: "all", limit: 100 })
    for await (const s of subs) {
      // Gather all candidate timestamps for this subscription
      const candidates: number[] = []
      if (typeof s.canceled_at === "number" && s.canceled_at > 0) {
        candidates.push(s.canceled_at)
      }
      if (typeof s.ended_at === "number" && s.ended_at > 0) {
        candidates.push(s.ended_at)
      }
      if (
        s.cancel_at_period_end === true &&
        typeof s.cancel_at === "number" &&
        s.cancel_at > 0
      ) {
        candidates.push(s.cancel_at)
      }

      // Map -> month index (within window), then de-dupe per subscription
      const monthIdx = new Set<number>()
      for (const ts of candidates) {
        if (ts >= gte && ts < lt) {
          const bi = labelForTimestamp(idx, ts)
          if (bi !== -1) monthIdx.add(bi)
        }
      }
      for (const bi of monthIdx) {
        cancellations[bi] += 1
      }

      if (debug && debugCancelEffectiveSamples.length < 10) {
        const ce =
          typeof s.canceled_at === "number" && s.canceled_at > 0
            ? new Date(s.canceled_at * 1000).toISOString()
            : undefined
        const ee =
          typeof s.ended_at === "number" && s.ended_at > 0
            ? new Date(s.ended_at * 1000).toISOString()
            : undefined
        const ca =
          s.cancel_at_period_end === true &&
          typeof s.cancel_at === "number" &&
          s.cancel_at > 0
            ? new Date(s.cancel_at * 1000).toISOString()
            : undefined
        const months_effective = Array.from(monthIdx.values())
          .map((bi) => labels[bi])
          .sort()
        debugCancelEffectiveSamples.push({
          id: String(s.id ?? ""),
          candidates_iso: { canceled_at: ce, ended_at: ee, cancel_at: ca },
          months_effective,
        })
      }
    }
  } catch {
    // leave zeros
  }

  // --- OPTIONAL alternate view: cancellation "REQUESTED" month (not effective) ---
  const debugCancelRequestedSamples: Array<{
    sub_id: string
    kind: "deleted" | "updated"
    event_iso: string
    month: string
  }> = []
  if (cancelMode === "requested") {
    try {
      const requested = Array<number>(monthsParam).fill(0)
      const seen = new Set<string>() // de-dupe per subscription per month

      // Iterate month-by-month to guarantee coverage of older months (e.g., June)
      for (let i = 0; i < monthsParam; i++) {
        const g = monthStartsSec[i]
        const l = monthEndsSec[i]

        // 1) Immediate cancels: deletion events (request==effective) in THIS month
        try {
          const deletedEvts = stripe.events.list({
            type: "customer.subscription.deleted",
            created: { gte: g, lt: l },
            limit: 100,
          })
          for await (const e of deletedEvts) {
            const obj = (e.data?.object ?? {}) as any
            const subId = typeof obj?.id === "string" ? obj.id : ""
            if (!subId) continue
            const key = `${subId}|${i}`
            if (seen.has(key)) continue
            seen.add(key)
            requested[i] += 1
            if (debug && debugCancelRequestedSamples.length < 20) {
              const ts = typeof e.created === "number" ? e.created : 0
              debugCancelRequestedSamples.push({
                sub_id: subId,
                kind: "deleted",
                event_iso: ts ? new Date(ts * 1000).toISOString() : "",
                month: labels[i],
              })
            }
          }
        } catch (e) {
          // best-effort month slice: swallow and continue
          void e
        }

        // 2) Scheduled cancels: when cancel_at_period_end toggles on (or cancel_at set) in THIS month
        try {
          const updatedEvts = stripe.events.list({
            type: "customer.subscription.updated",
            created: { gte: g, lt: l },
            limit: 100,
          })
          for await (const e of updatedEvts) {
            const obj = (e.data?.object ?? {}) as any
            const prev = (e.data as any)?.previous_attributes ?? {}
            const toggledOn =
              (prev?.cancel_at_period_end === false &&
                obj?.cancel_at_period_end === true) ||
              (prev?.cancel_at == null &&
                typeof obj?.cancel_at === "number" &&
                obj.cancel_at > 0)

            if (!toggledOn) continue
            const subId = typeof obj?.id === "string" ? obj.id : ""
            if (!subId) continue
            const key = `${subId}|${i}`
            if (seen.has(key)) continue
            seen.add(key)
            requested[i] += 1
            if (debug && debugCancelRequestedSamples.length < 20) {
              const ts = typeof e.created === "number" ? e.created : 0
              debugCancelRequestedSamples.push({
                sub_id: subId,
                kind: "updated",
                event_iso: ts ? new Date(ts * 1000).toISOString() : "",
                month: labels[i],
              })
            }
          }
        } catch (e) {
          // best-effort month slice: swallow and continue
          void e
        }
      }

      // Replace effective view with requested view
      for (let i = 0; i < monthsParam; i++) cancellations[i] = requested[i]
    } catch {
      // ignore — keep "effective" data
    }
  }

  // Net = gross − refunds (month-aligned)
  const net = gross.map((g, i) => Math.max(0, g - (refunds[i] ?? 0)))

  const payload: TSResponse = {
    months: labels,
    gross_cents: gross,
    refunds_cents: refunds,
    net_paid_cents: net,
    new_customers: newCust,
    active_subs: activeSubs,
    cancellations,
    _debug_used_secret_name: secretName,
    _debug_mode: keyMode,
    _debug: usedFastPath
      ? "balance_transactions"
      : "invoices_refunds_customers",
    ...(debug
      ? {
          _debug_window: {
            gte_iso: new Date(gte * 1000).toISOString(),
            lt_iso: new Date(lt * 1000).toISOString(),
            active_mode: activeMode,
            cancellation_mode:
              cancelMode === "requested" ? "requested" : "effective",
          },
          _debug_active_samples: debugActiveSamples,
          _debug_cancel_effective_samples: debugCancelEffectiveSamples,
          ...(cancelMode === "requested"
            ? { _debug_cancel_requested_samples: debugCancelRequestedSamples }
            : {}),
        }
      : {}),
  }

  // Cache only non-debug responses (avoid caching large debug payloads)
  if (!debug) cache.set(cacheKey, { at: Date.now(), data: payload })

  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  })
}
