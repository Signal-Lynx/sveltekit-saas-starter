// src/lib/server/admin/metrics.ts
import Stripe from "stripe"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { env as envPriv } from "$env/dynamic/private"
import { env as envPub } from "$env/dynamic/public"

// --- Stripe client (fail fast with a clear error) ---
if (!envPriv.PRIVATE_STRIPE_API_KEY) {
  throw new Error(
    "[admin/metrics] Missing PRIVATE_STRIPE_API_KEY. Set it in your private env.",
  )
}

const stripe = new Stripe(envPriv.PRIVATE_STRIPE_API_KEY, {
  apiVersion: "2026-01-28.clover",
})

// ---------- Types ----------
type StripeSubList = Awaited<ReturnType<typeof stripe.subscriptions.list>>

export type DailyRow = {
  day: string
  mrr_cents: number
  active_subscriptions: number
}

export type MonthlyRow = {
  month: string
  mrr_cents: number
}

type Scope = "mapped" | "allowlist" | "all"

// ---------- Helpers ----------
function envScope(): Scope {
  const raw = (envPub.PUBLIC_ADMIN_MRR_SCOPE ?? "mapped").toLowerCase()
  return (["mapped", "allowlist", "all"] as const).includes(raw as Scope)
    ? (raw as Scope)
    : "mapped"
}

/**
 * Normalize a price/quantity to monthly cents.
 * - Respects recurring.interval and recurring.interval_count (e.g., every 3 months).
 * - Note: discounts, trials, and proration are intentionally ignored to preserve existing behavior.
 */
function toMonthlyCents(
  price: Stripe.Price | null,
  qty: number | null | undefined,
): number {
  if (!price || !price.recurring) return 0

  const unit = price.unit_amount ?? 0 // in cents
  const q = qty ?? 1
  const interval = price.recurring.interval
  const count = price.recurring.interval_count ?? 1

  const base = unit * q
  switch (interval) {
    case "year":
      // e.g., every 2 years => divide by 24 months
      return Math.round(base / (12 * count))
    case "month":
      // e.g., every 3 months => divide by 3
      return Math.round(base / count)
    case "week":
      // approx monthly factor; respect count (every N weeks)
      return Math.round((base * 52) / (12 * count))
    case "day":
      // approx monthly factor; respect count (every N days)
      return Math.round((base * 365.25) / (12 * count))
    default:
      return Math.round(base / count)
  }
}

function countsAsActive(status: Stripe.Subscription.Status): boolean {
  // Preserve existing behavior: active, trialing, past_due count as active
  return status === "active" || status === "trialing" || status === "past_due"
}

/** Iterate all subs in account (paginated) */
async function* listAllSubs(): AsyncGenerator<
  Stripe.Subscription,
  void,
  unknown
> {
  let starting_after: string | undefined = undefined
  do {
    const resp: StripeSubList = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after,
    })
    for (const s of resp.data) yield s
    starting_after = resp.has_more
      ? resp.data[resp.data.length - 1].id
      : undefined
  } while (starting_after)
}

/** Iterate subs for a given customer (paginated) */
async function* listSubsForCustomer(
  customer: string,
): AsyncGenerator<Stripe.Subscription, void, unknown> {
  let starting_after: string | undefined = undefined
  do {
    const resp: StripeSubList = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after,
      customer,
    })
    for (const s of resp.data) yield s
    starting_after = resp.has_more
      ? resp.data[resp.data.length - 1].id
      : undefined
  } while (starting_after)
}

/** Safely coerce to a non-negative integer within a bound (defensive only). */
function clampInt(n: number, min = 1, max = 10_000): number {
  if (!Number.isFinite(n)) return min
  const i = Math.trunc(n)
  return Math.min(Math.max(i, min), max)
}

/** Build allowlists for both price and product IDs (supports either/both envs). */
function buildAllowlists(): {
  priceIds: Set<string>
  productIds: Set<string>
} {
  // Historically you supported either PRIVATE_STRIPE_PRODUCT_IDS or PRIVATE_STRIPE_PRICE_IDS.
  // This accepts BOTH simultaneously, without changing existing behavior.
  const rawProducts = String(envPriv.PRIVATE_STRIPE_PRODUCT_IDS ?? "").trim()
  const rawPrices = String(envPriv.PRIVATE_STRIPE_PRICE_IDS ?? "").trim()

  const toSet = (csv: string) =>
    new Set(
      csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )

  return {
    priceIds: toSet(rawPrices),
    productIds: toSet(rawProducts),
  }
}

/** Check if a Stripe price matches allowlist by price or product. */
function isPriceAllowed(
  price: Stripe.Price | null,
  allowPriceIds: Set<string>,
  allowProductIds: Set<string>,
): boolean {
  if (!price) return false
  if (allowPriceIds.size && allowPriceIds.has(price.id)) return true

  // price.product can be string or expanded Product
  const prodId =
    typeof price.product === "string"
      ? price.product
      : (price.product?.id ?? null)

  return !!(prodId && allowProductIds.size && allowProductIds.has(prodId))
}

// ---------- Public Functions ----------

/** Pull last N days from admin_mrr_daily */
export async function getMRRDailies(days: number): Promise<DailyRow[]> {
  const d = clampInt(days, 1, 366 * 5) // defensive upper bound (5 years)
  const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from("admin_mrr_daily")
    .select("day, mrr_cents, active_subscriptions")
    .gte("day", since)
    .order("day", { ascending: true })

  if (error || !data) return []
  return data as DailyRow[]
}

/** Roll daily into month buckets; uses SQL fn if present, else JS fallback */
export async function getMRRMonthlies(months: number): Promise<MonthlyRow[]> {
  const m = clampInt(months, 1, 240) // up to 20 years defensively
  const start = new Date()
  start.setMonth(start.getMonth() - (m - 1))
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  // Try RPC if available (safe to fail)
  const rpc = await supabaseAdmin.rpc("admin_mrr_monthly", {
    p_start: monthStart,
  })
  if (!rpc.error && rpc.data) return rpc.data as MonthlyRow[]

  // Fallback: last snapshot per month
  const daily = await supabaseAdmin
    .from("admin_mrr_daily")
    .select("day, mrr_cents")
    .gte("day", monthStart)
    .order("day", { ascending: true })

  if (daily.error || !daily.data) return []
  const map = new Map<string, number>()
  for (const r of daily.data as { day: string; mrr_cents: number }[]) {
    const key = r.day.slice(0, 7) // YYYY-MM
    map.set(key, r.mrr_cents) // last write wins => last snapshot of month
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, mrr_cents]) => ({ month, mrr_cents }))
}

// Compute live MRR/active subs for "today" without writing to DB
async function computeMRRTotals(): Promise<{
  mrr_cents: number
  active_subscriptions: number
}> {
  const scope = envScope()
  const { priceIds: allowedPriceIds, productIds: allowedProductIds } =
    buildAllowlists()

  let totalMRR = 0
  let activeCount = 0

  const processSub = (sub: Stripe.Subscription) => {
    let subMonthly = 0
    let anyAllowedItem = false

    for (const item of sub.items.data) {
      const price = item.price
      const monthly = toMonthlyCents(price, item.quantity)
      if (scope === "allowlist") {
        const allowed = isPriceAllowed(
          price,
          allowedPriceIds,
          allowedProductIds,
        )
        if (allowed) {
          anyAllowedItem = true
          subMonthly += monthly
        }
      } else {
        subMonthly += monthly
      }
    }

    const okStatus = countsAsActive(sub.status)
    const okByScope = scope === "allowlist" ? anyAllowedItem : true
    if (okStatus && okByScope) {
      activeCount += 1
      totalMRR += subMonthly
    }
  }

  if (scope === "mapped") {
    const { data: scRows, error } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .not("stripe_customer_id", "is", null)

    if (error) {
      console.error("[admin/metrics] stripe_customers select error:", error)
    }

    const ids = (scRows ?? [])
      .map(
        (r: { stripe_customer_id: string | null }) =>
          r.stripe_customer_id as string,
      )
      .filter(Boolean)

    for (const customer of ids) {
      for await (const sub of listSubsForCustomer(customer)) processSub(sub)
    }
  } else {
    for await (const sub of listAllSubs()) processSub(sub)
  }

  return { mrr_cents: totalMRR, active_subscriptions: activeCount }
}

/**
 * Recompute MRR for TODAY using scope:
 *  - mapped: only customers in stripe_customers
 *  - allowlist: any customer, but only allowed price/product IDs contribute
 *  - all: every subscription contributes
 */
export async function recomputeTodayMRR(): Promise<DailyRow> {
  const { mrr_cents, active_subscriptions } = await computeMRRTotals()
  const today = new Date().toISOString().slice(0, 10)

  const base = { day: today, mrr_cents, active_subscriptions }

  // Attempt 1: for schemas where `arr_cents` exists (and may be NOT NULL)
  const tryWithArr = await supabaseAdmin
    .from("admin_mrr_daily")
    .upsert({ ...base, arr_cents: mrr_cents * 12 }, { onConflict: "day" })
    .select("day, mrr_cents, active_subscriptions")
    .single()

  if (!tryWithArr.error && tryWithArr.data) {
    return tryWithArr.data as DailyRow
  }

  // Inspect the error to decide how to degrade
  const err = tryWithArr.error
  const code = (err as any)?.code ?? ""
  const msg = (err as any)?.message ?? ""

  // If table is missing, don't fail the action—return ephemeral totals
  const missingTable =
    code === "42P01" || /relation .*admin_mrr_daily.* does not exist/i.test(msg)
  if (missingTable) {
    console.warn(
      "[admin/metrics] 'admin_mrr_daily' is missing; returning live (non-persisted) totals.",
    )
    return { day: today, mrr_cents, active_subscriptions }
  }

  // If `arr_cents` column doesn't exist, retry without it (older schema)
  const missingArrCol = /column .*arr_cents.* does not exist/i.test(msg)
  if (missingArrCol) {
    const tryWithoutArr = await supabaseAdmin
      .from("admin_mrr_daily")
      .upsert(base, { onConflict: "day" })
      .select("day, mrr_cents, active_subscriptions")
      .single()

    if (!tryWithoutArr.error && tryWithoutArr.data) {
      return tryWithoutArr.data as DailyRow
    }

    // If even the fallback fails, throw that error to surface the real cause
    throw tryWithoutArr.error ?? err
  }

  // Some other error (RLS, etc.)
  throw err
}

/** Convenience: summary counts for dashboard header */
export async function getSummary() {
  const last = await supabaseAdmin
    .from("admin_mrr_daily")
    .select("day, mrr_cents, active_subscriptions")
    .order("day", { ascending: false })
    .limit(1)
    .single()

  let mrr = 0
  let active = 0
  let lastDay: string | null = null

  const missingTable =
    !!last.error &&
    ((last.error as any).code === "42P01" ||
      /relation .*admin_mrr_daily.* does not exist/i.test(
        (last.error as any).message ?? "",
      ))

  if (!missingTable && last.data) {
    mrr = last.data.mrr_cents ?? 0
    active = last.data.active_subscriptions ?? 0
    lastDay = last.data.day ?? null
  } else {
    // Live fallback for fresh test envs (no snapshot yet)
    const t = await computeMRRTotals()
    mrr = t.mrr_cents
    active = t.active_subscriptions
    lastDay = null
  }

  const [
    { count: profiles_total, error: e1 },
    { count: unsubscribed_count, error: e2 },
    { count: beta_count, error: e3 },
    { count: stripe_customers, error: e4 },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("unsubscribed", true),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_beta_tester", true),
    supabaseAdmin
      .from("stripe_customers")
      .select("*", { count: "exact", head: true }),
  ])

  if (e1) console.error("[admin/metrics] profiles_total count error:", e1)
  if (e2) console.error("[admin/metrics] unsubscribed_count error:", e2)
  if (e3) console.error("[admin/metrics] beta_count error:", e3)
  if (e4) console.error("[admin/metrics] stripe_customers count error:", e4)

  return {
    mrr_cents: mrr,
    arr_cents: mrr * 12,
    active_subscriptions: active,
    last_snapshot_day: lastDay,
    profiles_total: profiles_total ?? 0,
    unsubscribed_count: unsubscribed_count ?? 0,
    beta_count: beta_count ?? 0,
    stripe_customers: stripe_customers ?? 0,
  }
}
