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

// Bundle mapping for the template (buy Society, get Hoverboard free):
// Matches src/lib/data/products.ts in the template
const SOCIETY_PRICE_ID = "price_template_society_B"
const HOVERBOARD_FREE_PRICE_ID = "price_template_hover_free_bundle"

// Simple guard for Stripe price ID format
const PRICE_ID_RE = /^price_[A-Za-z0-9]+$/

// Trial configuration (per product ID, in days).
// Example: Timeline C (subscription) gets a 7-day trial.
const PRODUCT_TRIAL_DAYS: Record<string, number> = {
  timeline_c: 7,
  antigrav: 7, // Society membership
}

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

  // --- START: HEALTH CHECK (Ported from Production) ---
  const lmBase = env.PRIVATE_LICENSE_MANAGER_URL
  const lmKey = env.PRIVATE_LICENSE_MANAGER_API_KEY
  if (lmBase && lmKey) {
    try {
      const healthUrl = `${lmBase.replace(/\/+$/, "")}/api/v1/internal/user-entitlements/${user.id}`
      const res = await lmFetch(healthUrl, {
        method: "GET",
        headers: { "X-Internal-API-Key": lmKey },
        firstTimeoutMs: 1500,
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
      throw redirect(303, "/account/billing?error=checkout_unavailable")
    }
  }
  // --- END: HEALTH CHECK ---

  // Ensure Stripe is configured
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

  // Defensive check
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

  // Build line items (Template specific bundling logic)
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ]
  // If user buys "Society" (antigrav), add free "Hoverboard" (schematics)
  if (priceId === SOCIETY_PRICE_ID) {
    line_items.push({ price: HOVERBOARD_FREE_PRICE_ID, quantity: 1 })
  }

  // Compute mode
  const mode: "payment" | "subscription" =
    productToPurchase.stripe_mode === "subscription"
      ? "subscription"
      : "payment"

  const stripe = new Stripe(stripeApiKey, { apiVersion: STRIPE_API_VERSION })

  // Base session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    line_items,
    customer: customerId,
    mode,
    success_url: `${url.origin}/account/purchase-success`,
    cancel_url: `${url.origin}/account/billing`,

    // --- SECURITY & COMPLIANCE ---
    // Force 3D Secure (Any = attempt 3DS if card supports it, regardless of risk score)
    payment_method_options: {
      card: {
        request_three_d_secure: "any",
      } as any, // Cast to any to bypass strict type definition missing this property
    },
    // Force user to check a box agreeing to Terms of Service
    consent_collection: {
      terms_of_service: "required",
    },

    // --- NEW: Enable Stripe Tax ---
    automatic_tax: { enabled: true },

    // --- NEW: Enable Promo Codes (e.g. for testing) ---
    allow_promotion_codes: true,

    // Collect billing address for tax calculation
    billing_address_collection: "auto",
    customer_update: {
      address: "auto",
    },

    // Store supabase user id on the session for reconciliation
    metadata: { supabase_user_id: user.id },
    client_reference_id: user.id,
  }

  // Duplicate metadata on subordinate objects
  if (mode === "subscription") {
    // --- NEW: Dynamic Trial Logic ---
    const trialDays = PRODUCT_TRIAL_DAYS[productToPurchase.id] ?? undefined

    sessionParams.subscription_data = {
      metadata: { supabase_user_id: user.id },
      // Apply trial if configured
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    }
  } else {
    sessionParams.payment_intent_data = {
      metadata: { supabase_user_id: user.id },
    }
  }

  // Create the Checkout Session
  let stripeSession: Stripe.Checkout.Session
  try {
    stripeSession = await stripe.checkout.sessions.create(sessionParams)
  } catch (e) {
    console.error("[Subscribe] Error creating Stripe Checkout Session", e)
    throw error(500, "Stripe Error (SSE): If issue persists please contact us.")
  }

  const checkoutUrl = stripeSession.url
  if (!checkoutUrl) {
    console.error("[Subscribe] Stripe returned no checkout URL", {
      sessionId: stripeSession.id,
    })
    throw redirect(303, "/pricing")
  }

  throw redirect(303, checkoutUrl)
}
