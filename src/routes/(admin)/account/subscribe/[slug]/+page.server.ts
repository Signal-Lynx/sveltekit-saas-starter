// src/routes/(admin)/account/subscribe/[slug]/+page.server.ts
import { allProducts } from "$lib/data/products"
import { env } from "$env/dynamic/private"
import { error, redirect } from "@sveltejs/kit"
import Stripe from "stripe"
import { getOrCreateCustomerId } from "$lib/server/subscription_helpers"
import type { PageServerLoad } from "./$types"
import { lmFetch } from "$lib/server/subscription"

// Keep the same Stripe API version used elsewhere in the project
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2023-08-16"

// Bundle mapping (unchanged behavior):
// If user buys Lynx-Relay, also add $0 Signal Shield.
const LYNX_RELAY_PRICE_ID = "price_1RzTIuFAtbtBUt5cIXz6XaaH"
const SIGNAL_SHIELD_FREE_PRICE_ID = "price_1RzUiMFAtbtBUt5cKcQIcz3S"

// Simple guard for Stripe price ID format (defensive only; behavior unchanged)
const PRICE_ID_RE = /^price_[A-Za-z0-9]+$/

export const load: PageServerLoad = async ({
  params,
  url,
  locals: { user },
  cookies,
}) => {
  // Require auth, preserve original redirect behavior
  if (!user) {
    const next = encodeURIComponent(url.pathname)
    throw redirect(303, `/login?next=${next}`)
  }

  // --- START: NEW HEALTH CHECK ---
  const lmBase = env.PRIVATE_LICENSE_MANAGER_URL
  const lmKey = env.PRIVATE_LICENSE_MANAGER_API_KEY
  if (lmBase && lmKey) {
    try {
      // Use a simple, lightweight endpoint. A dedicated /health endpoint is ideal.
      // We assume one exists at /api/v1/health. If not, any simple GET endpoint works.
      const healthUrl = `${lmBase.replace(/\/+$/, "")}/api/v1/internal/user-entitlements/${user.id}`
      const res = await lmFetch(healthUrl, {
        method: "GET",
        headers: { "X-Internal-API-Key": lmKey },
        firstTimeoutMs: 1500, // Very aggressive timeout for a health check
        retryTimeoutMs: 2000,
      })

      if (!res.ok) {
        throw new Error(
          `License Manager health check failed with status ${res.status}`,
        )
      }
    } catch (e) {
      console.error(
        "[Subscribe] License Manager health check failed, blocking purchase.",
        e,
      )
      // Redirect back to billing with an error message
      throw redirect(303, "/account/billing?error=checkout_unavailable")
    }
  }
  // --- END: NEW HEALTH CHECK ---

  // Ensure Stripe is configured; fail fast with a clear error
  const stripeApiKey = env.PRIVATE_STRIPE_API_KEY
  if (!stripeApiKey) {
    console.error("[Subscribe] Missing env.PRIVATE_STRIPE_API_KEY")
    throw error(500, {
      message:
        "Misconfiguration (Stripe key missing). Please contact support if this persists.",
    } as any)
  }

  // Private beta purchase gating (kept identical)
  if (env.PRIVATE_BETA_PURCHASE_PASSWORD) {
    const purchaseAccessGranted =
      cookies.get("purchase_access_granted") === "true"
    if (!purchaseAccessGranted) {
      const redirectTo = `/access?gate=purchase&next=${encodeURIComponent(url.pathname)}`
      throw redirect(303, redirectTo)
    }
  }

  const priceId = params.slug

  // Defensive check: do not change behavior, just fail earlier with clearer logs
  if (!priceId || !PRICE_ID_RE.test(priceId)) {
    console.warn(`[Subscribe] Invalid priceId format: ${priceId}`)
    throw error(400, { message: "Invalid plan selected." } as any)
  }

  // Only allow prices that exist in our product catalog
  const productToPurchase = allProducts.find(
    (p) => p.stripe_price_id === priceId,
  )
  if (!productToPurchase) {
    console.warn(`[Subscribe] Blocked purchase of unknown price ID: ${priceId}`)
    throw error(400, { message: "Invalid plan selected." } as any)
  }

  // Resolve/ensure Stripe customer id for the current user
  const { error: idError, customerId } = await getOrCreateCustomerId({ user })
  if (idError || !customerId) {
    console.error("[Subscribe] Failed to get/create Stripe customerId", idError)
    throw error(500, {
      message: "Unknown error (PCID). If issue persists, please contact us.",
    } as any)
  }

  // Build line items (preserves existing bundle behavior)
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ]
  if (priceId === LYNX_RELAY_PRICE_ID) {
    line_items.push({ price: SIGNAL_SHIELD_FREE_PRICE_ID, quantity: 1 })
  }

  // Compute mode with a safe default (unchanged default = "payment")
  const mode: "payment" | "subscription" =
    productToPurchase.stripe_mode === "subscription"
      ? "subscription"
      : "payment"

  // Lazily create Stripe client (ensures env is validated before instantiation)
  const stripe = new Stripe(stripeApiKey, { apiVersion: STRIPE_API_VERSION })

  // Base session params (success/cancel URLs unchanged)
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    line_items,
    customer: customerId,
    mode,
    success_url: `${url.origin}/account/purchase-success`,
    cancel_url: `${url.origin}/account/billing`,
    // Store supabase user id on the session for reconciliation
    metadata: { supabase_user_id: user.id },
    client_reference_id: user.id,
  }

  // Duplicate metadata on subordinate objects per original behavior
  if (mode === "subscription") {
    sessionParams.subscription_data = {
      metadata: { supabase_user_id: user.id },
    }
  } else {
    sessionParams.payment_intent_data = {
      metadata: { supabase_user_id: user.id },
    }
  }

  // Create the Checkout Session; only this call is inside try/catch
  let stripeSession: Stripe.Checkout.Session
  try {
    stripeSession = await stripe.checkout.sessions.create(sessionParams)
  } catch (e) {
    // Keep original user-facing message; improve server log detail
    console.error("[Subscribe] Error creating Stripe Checkout Session", e)
    throw error(500, "Stripe Error (SSE): If issue persists please contact us.")
  }

  const checkoutUrl = stripeSession.url
  if (!checkoutUrl) {
    console.error("[Subscribe] Stripe returned no checkout URL", {
      sessionId: stripeSession.id,
    })
    // Preserve original fallback redirect
    throw redirect(303, "/pricing")
  }

  // Important: do NOT wrap this in try/catch — let SvelteKit handle the 303
  throw redirect(303, checkoutUrl)
}
