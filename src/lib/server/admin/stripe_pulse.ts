// src/lib/server/admin/stripe_pulse.ts
import Stripe from "stripe"
import { env as envPriv } from "$env/dynamic/private"

if (!envPriv.PRIVATE_STRIPE_API_KEY) {
  throw new Error("[stripe_pulse] Missing PRIVATE_STRIPE_API_KEY.")
}

const stripe = new Stripe(envPriv.PRIVATE_STRIPE_API_KEY, {
  apiVersion: "2026-01-28.clover",
})

type ApiList<T> = Stripe.ApiList<T>

function tsDaysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - days * 24 * 60 * 60
}
function tsDaysFromNow(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
}

async function* listInvoices(params: Stripe.InvoiceListParams) {
  let starting_after: string | undefined
  do {
    const page: ApiList<Stripe.Invoice> = await stripe.invoices.list({
      limit: 100,
      starting_after,
      ...params,
    })
    for (const inv of page.data) yield inv
    starting_after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (starting_after)
}

async function* listCustomers(params: Stripe.CustomerListParams) {
  let starting_after: string | undefined
  do {
    const page: ApiList<Stripe.Customer> = await stripe.customers.list({
      limit: 100,
      starting_after,
      ...params,
    })
    for (const c of page.data) yield c
    starting_after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (starting_after)
}

async function* listSubscriptions(params: Stripe.SubscriptionListParams) {
  let starting_after: string | undefined
  do {
    const page: ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      limit: 100,
      starting_after,
      ...params,
    })
    for (const s of page.data) yield s
    starting_after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (starting_after)
}

async function* listEvents(params: Stripe.EventListParams) {
  let starting_after: string | undefined
  do {
    const page: ApiList<Stripe.Event> = await stripe.events.list({
      limit: 100,
      starting_after,
      ...params,
    })
    for (const e of page.data) yield e
    starting_after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (starting_after)
}

async function* listRefunds(params: Stripe.RefundListParams) {
  let starting_after: string | undefined
  do {
    const page: ApiList<Stripe.Refund> = await stripe.refunds.list({
      limit: 100,
      starting_after,
      ...params,
    })
    for (const r of page.data) yield r
    starting_after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (starting_after)
}

export type StripePulse = {
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

// -------- tiny in-proc cache (per process) --------
let CACHE: { at: number; data: StripePulse } | null = null

export async function getStripePulseSummaryCached(
  ttlSec = 60,
): Promise<StripePulse> {
  if (CACHE && Date.now() - CACHE.at < ttlSec * 1000) return CACHE.data
  const data = await getStripePulseSummary()
  CACHE = { at: Date.now(), data }
  return data
}

export async function getStripePulseSummary(): Promise<StripePulse> {
  const since30 = tsDaysAgo(30)
  const since7 = tsDaysAgo(7)
  const next7 = tsDaysFromNow(7)
  const now = Math.floor(Date.now() / 1000)

  // (A) money (paid & refunds)
  let gross30 = 0
  for await (const inv of listInvoices({
    status: "paid",
    created: { gte: since30 },
  })) {
    gross30 += inv.amount_paid ?? 0
  }

  let gross7 = 0
  for await (const inv of listInvoices({
    status: "paid",
    created: { gte: since7 },
  })) {
    gross7 += inv.amount_paid ?? 0
  }

  let refunds30 = 0
  for await (const r of listRefunds({ created: { gte: since30 } })) {
    refunds30 += r.amount ?? 0
  }

  // (B) customers (new in last 30 days)
  let newCustomers30 = 0
  for await (const _c of listCustomers({ created: { gte: since30 } })) {
    newCustomers30++
  }

  // (C) subscriptions — scan only active-like for active count + renewals
  const activeLike: Stripe.Subscription.Status[] = [
    "active",
    "trialing",
    "past_due",
  ]
  let activeSubs = 0
  let renewalsNext7 = 0
  for (const st of activeLike) {
    for await (const s of listSubscriptions({ status: st })) {
      activeSubs++
      const cpe = (() => {
        const ends = (s.items?.data ?? [])
          .map((it) =>
            typeof (it as any).current_period_end === "number"
              ? (it as any).current_period_end
              : null,
          )
          .filter((v): v is number => typeof v === "number")

        // If multiple items exist, use the soonest end as “next renewal”.
        return ends.length ? Math.min(...ends) : null
      })()

      if (cpe && cpe <= next7) renewalsNext7++
    }
  }

  // (D) new & canceled in 30d — use Events (efficient)
  let newSubs30 = 0
  for await (const _e of listEvents({
    type: "customer.subscription.created",
    created: { gte: since30 },
  })) {
    newSubs30++
  }

  let canceledSubs30 = 0
  for await (const _e of listEvents({
    type: "customer.subscription.deleted",
    created: { gte: since30 },
  })) {
    canceledSubs30++
  }

  // (E) open & past-due invoices
  let openCount = 0
  let openAmt = 0
  let pastDueCount = 0
  let pastDueAmt = 0

  for await (const inv of listInvoices({ status: "open" })) {
    openCount++
    const remaining = inv.amount_remaining ?? inv.amount_due ?? 0
    openAmt += remaining

    const due = inv.due_date ?? inv.next_payment_attempt ?? null
    if (typeof due === "number" && due < now) {
      pastDueCount++
      pastDueAmt += remaining
    }
  }

  return {
    gross_paid_30d_cents: gross30,
    gross_paid_7d_cents: gross7,
    refunds_30d_cents: refunds30,
    net_paid_30d_cents: Math.max(0, gross30 - refunds30),

    new_customers_30d: newCustomers30,
    active_subscriptions: activeSubs,
    new_subscriptions_30d: newSubs30,
    canceled_subscriptions_30d: canceledSubs30,

    renewals_next_7d_count: renewalsNext7,
    open_invoices_count: openCount,
    open_invoices_amount_cents: openAmt,
    past_due_invoices_count: pastDueCount,
    past_due_invoices_amount_cents: pastDueAmt,
  }
}
