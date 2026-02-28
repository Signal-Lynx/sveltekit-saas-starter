// src/lib/server/subscription_helpers.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { env } from "$env/dynamic/private"
import Stripe from "stripe"
import { allProducts } from "$lib/data/products"

const stripe = new Stripe(env.PRIVATE_STRIPE_API_KEY!, {
  apiVersion: "2026-02-25.clover",
})

// Minimal user shape used throughout the app (matches locals.user)
type MinimalUser = { id: string; email?: string | null }

// ── helpers ───────────────────────────────────────────────────────────────────

/** Convert unknown error-like values into a real Error instance. */
function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === "string") return new Error(e)
  try {
    return new Error(JSON.stringify(e))
  } catch {
    return new Error("Unknown error")
  }
}

/** True when PostgREST `.single()` returns "no rows" (PGRST116). */
function isNoRowsError(err: { code?: string } | null | undefined): boolean {
  return !!err && err.code === "PGRST116"
}

/** Pick a primary subscription by status. */
function pickPrimaryStripeSub(
  subs: Stripe.Subscription[],
): Stripe.Subscription | undefined {
  return subs.find(
    (s) =>
      s.status === "active" ||
      s.status === "trialing" ||
      s.status === "past_due",
  )
}

/** Match an app product from a subscription item via product or price. */
function matchAppProductFromItem(item: Stripe.SubscriptionItem) {
  const productId = (item.price?.product as string | undefined) ?? ""
  const priceId = item.price?.id ?? ""

  // Preserve original behavior (product) and add safe fallback (price)
  const match =
    allProducts.find((p) => p.stripe_product_id === productId) ??
    allProducts.find((p) => p.stripe_price_id === priceId)

  return match ?? null
}

/** Fetch all subscription pages for a customer (defensive). */
async function listAllSubscriptionsForCustomer(customerId: string) {
  const pageSize = 100
  let hasMore = true
  let startingAfter: string | undefined
  const out: Stripe.Subscription[] = []

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      limit: pageSize,
      status: "all",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    out.push(...page.data)
    hasMore = page.has_more
    startingAfter = page.data.length
      ? page.data[page.data.length - 1].id
      : undefined
  }

  return out
}

// ── public API ────────────────────────────────────────────────────────────────

export const getOrCreateCustomerId = async ({
  user,
}: {
  user: MinimalUser | null
}) => {
  if (!user) {
    return { error: new Error("User not found.") }
  }

  // 1) Lookup existing mapping
  const { data: dbCustomer, error: lookupErr } = await supabaseAdmin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (lookupErr && !isNoRowsError(lookupErr)) {
    return { error: toError(lookupErr) }
  }
  if (dbCustomer?.stripe_customer_id) {
    return { customerId: dbCustomer.stripe_customer_id }
  }

  // 2) Best-effort profile to enrich Stripe metadata
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("full_name, website, company_name")
    .eq("id", user.id)
    .single()

  if (profileErr && !isNoRowsError(profileErr)) {
    return { error: toError(profileErr) }
  }

  // 3) Create Stripe customer
  let customer: Stripe.Response<Stripe.Customer>
  try {
    customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.full_name ?? "",
      metadata: {
        user_id: user.id,
        company_name: profile?.company_name ?? "",
        website: profile?.website ?? "",
      },
    })
  } catch (e) {
    return { error: toError(e) }
  }

  if (!customer?.id) {
    return { error: new Error("Unknown stripe user creation error") }
  }

  // 4) Persist mapping idempotently (avoid races/dupes)
  const { error: upsertErr } = await supabaseAdmin
    .from("stripe_customers")
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

  if (upsertErr) {
    return { error: toError(upsertErr) }
  }

  return { customerId: customer.id }
}

export const fetchSubscription = async ({
  customerId,
}: {
  customerId: string
}) => {
  let subs: Stripe.Subscription[]
  try {
    subs = await listAllSubscriptionsForCustomer(customerId)
  } catch (e) {
    return { error: toError(e) }
  }

  const primaryStripeSubscription = pickPrimaryStripeSub(subs)

  let appSubscription: (typeof allProducts)[number] | null = null
  if (primaryStripeSubscription) {
    for (const item of primaryStripeSubscription.items?.data ?? []) {
      appSubscription = matchAppProductFromItem(item)
      if (appSubscription) break
    }

    if (!appSubscription) {
      if (!primaryStripeSubscription.items?.data?.length) {
        return {
          error: new Error(
            "Stripe subscription has no items or product/price.",
          ),
        }
      }
      return {
        error: new Error(
          "Stripe subscription does not have matching app subscription.",
        ),
      }
    }
  }

  const primarySubscription =
    primaryStripeSubscription && appSubscription
      ? { stripeSubscription: primaryStripeSubscription, appSubscription }
      : null

  const hasEverHadSubscription = subs.length > 0

  return { primarySubscription, hasEverHadSubscription }
}
