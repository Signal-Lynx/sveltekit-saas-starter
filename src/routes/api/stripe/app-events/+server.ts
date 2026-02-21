// src/routes/(marketing)/stripe/webhook/+server.ts
import { error, json, type RequestHandler } from "@sveltejs/kit"
import Stripe from "stripe"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { withContext } from "$lib/server/logger"
import { env as cfg } from "$lib/server/env"

// --- Stripe client -----------------------------------------------------------
const stripe = new Stripe(cfg.PRIVATE_STRIPE_API_KEY, {
  apiVersion: "2026-01-28.clover",
})

// --- Small utils -------------------------------------------------------------
const nowIso = () => new Date().toISOString()

async function markProcessed(
  id: string,
  status: "ok" | "error",
  errMsg?: string,
) {
  await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      processed_at: nowIso(),
      status,
      error: errMsg ?? null,
    })
    .eq("id", id)
}

async function opportunisticPrune(log: {
  info?: (e: unknown, m?: unknown) => void
}) {
  // prune ~5% of the time to amortize cost
  if (Math.random() < 0.05) {
    const { data: deleted, error: pruneErr } = await supabaseAdmin.rpc(
      "prune_stripe_webhook_events",
      { retention_days: 60 },
    )
    if (!pruneErr) {
      ;(log ?? console).info?.("webhooks.pruned", { deleted })
    }
  }
}

async function upsertEventRow(event: Stripe.Event, raw_body: string, log: any) {
  const received_at = nowIso()
  const { data: inserted, error: upsertError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .upsert(
      {
        id: event.id,
        type: event.type,
        raw_body,
        received_at,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id")

  if (upsertError) {
    log?.warn?.("stripe.webhook.upsert_error", {
      eventId: event.id,
      msg: upsertError.message,
    })
  }

  return Array.isArray(inserted) && inserted.length > 0
}

async function mapStripeCustomerToUserId(
  customerId: string | null | undefined,
) {
  if (!customerId) return null
  const { data } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single()
  return data?.user_id ?? null
}

// --- Event handlers (extend safely without changing outward behavior) --------
async function handleCheckoutCompleted(event: Stripe.Event, log: any) {
  const session = event.data.object as Stripe.Checkout.Session
  log?.info?.("stripe.session.completed", {
    eventId: event.id,
    sessionId: session.id,
    customer: session.customer,
    email_present: !!session.customer_email,
  })
  // NOTE: Fulfillment is driven by subscription events; this is log-only.
}

async function handleSubscriptionLifecycle(event: Stripe.Event, log: any) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = (subscription.customer ?? null) as string | null
  const userId = await mapStripeCustomerToUserId(customerId)

  if (!userId) {
    log?.warn?.("stripe.subscription.no_user", {
      eventId: event.id,
      customerId,
    })
    return
  }

  log?.info?.("subscription.update", {
    eventId: event.id,
    userId,
    status: subscription.status,
    items: subscription.items?.data?.map((i) => i.price?.id).filter(Boolean),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  })

  // If you have an entitlement sync helper, call it here:
  // await syncUserEntitlements(userId, subscription)
}

async function handleInvoicePaidOrFailed(event: Stripe.Event, log: any) {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = (invoice.customer ?? null) as string | null
  const userId = await mapStripeCustomerToUserId(customerId)

  log?.info?.("invoice.event", {
    eventId: event.id,
    type: event.type,
    userId,
    customerId,
    invoiceId: invoice.id,
    paid: invoice.status === "paid",
    status: invoice.status,
    attempted: invoice.attempted,
    attempt_count: invoice.attempt_count,
  })
  // This is a good hook for billing notifications or dunning flows (log-only here).
}

// --- Verify + parse helper ---------------------------------------------------
function constructStripeEventOrThrow(rawBody: string, signature: string) {
  try {
    // You can tune tolerance via: { tolerance: 300 }
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      cfg.PRIVATE_STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    throw error(400, `Webhook Error: ${message}`)
  }
}

// --- POST handler ------------------------------------------------------------
export const POST: RequestHandler = async ({ request, locals }) => {
  const log = (locals?.log ?? withContext({})) as any

  // Stripe sends a raw payload; do NOT parse JSON before signature verification.
  const sig = request.headers.get("stripe-signature")
  if (!sig) throw error(400, "Missing Stripe signature")

  // Read the raw body exactly once
  const rawBody = await request.text()

  // Verify signature and parse the event
  const event = constructStripeEventOrThrow(rawBody, sig)

  // Idempotency fence: insert-or-ignore the event id
  const isFirstTimeSeeing = await upsertEventRow(event, rawBody, log)
  if (!isFirstTimeSeeing) {
    log?.info?.("stripe.webhook.duplicate", {
      eventId: event.id,
      type: event.type,
    })
    return json({ received: true, deduped: true })
  }

  log?.info?.("stripe.webhook.received", {
    eventId: event.id,
    type: event.type,
  })

  try {
    // Handle a conservative set of events; default is log-and-ack.
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, log)
        break

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end":
        await handleSubscriptionLifecycle(event, log)
        break

      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handleInvoicePaidOrFailed(event, log)
        break

      // Optional: async payment outcomes for Checkout
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
        await handleCheckoutCompleted(event, log)
        break

      default:
        // Safe default: unknown / new event types are acknowledged but logged.
        log?.info?.("stripe.webhook.unhandled", {
          eventId: event.id,
          type: event.type,
        })
        break
    }

    await markProcessed(event.id, "ok")
    await opportunisticPrune(log)

    // Keep outward response semantics unchanged
    return json({ received: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await markProcessed(event.id, "error", msg)

    log?.error?.("stripe.webhook.failure", {
      eventId: event.id,
      type: event.type,
      error: msg,
    })

    // Acknowledge so Stripe doesn't hot-loop retries on our bug; row is retained for reprocessing.
    return json({ received: true, error: "handler-error" })
  }
}

// Explicit preflight (harmless; Stripe won’t call it, but safe to expose)
export const OPTIONS: RequestHandler = async () =>
  new Response(null, { status: 204 })
