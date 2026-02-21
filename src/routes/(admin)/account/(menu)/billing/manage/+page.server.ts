// src/routes/(admin)/account/(menu)/billing/manage/+page.server.ts
import { env } from "$env/dynamic/private"
import { error, redirect } from "@sveltejs/kit"
import Stripe from "stripe"
import { getOrCreateCustomerId } from "$lib/server/subscription_helpers"
import type { PageServerLoad } from "./$types"
import { reportWebsiteError } from "$lib/server/errorApi"

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = env.PRIVATE_STRIPE_API_KEY
  if (!key) {
    throw new Error("Missing PRIVATE_STRIPE_API_KEY")
  }

  _stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" })
  return _stripe
}

function maskId(id: string | null | undefined): string {
  if (!id) return ""
  const last = id.slice(-4)
  return `${"*".repeat(Math.max(0, id.length - 4))}${last}`
}

// Detect SvelteKit's redirect "error object" without importing Redirect,
// because in this SvelteKit version it's not a runtime export.
function isSvelteKitRedirect(
  e: unknown,
): e is { status: number; location: string } {
  if (!e || typeof e !== "object") return false
  const status = (e as any).status
  const location = (e as any).location
  return (
    typeof status === "number" &&
    status >= 300 &&
    status < 400 &&
    typeof location === "string"
  )
}

export const load: PageServerLoad = async ({ url, locals: { user } }) => {
  // 1. must be logged in
  if (!user) {
    console.warn("[billing/manage] redirect (no user)")
    throw redirect(303, "/login")
  }

  console.info("[billing/manage] start", { userId: user.id })

  try {
    // 2. init Stripe
    const stripe = getStripe()

    // 3. ensure we have / create a Stripe customer for this user
    const { error: idError, customerId } = await getOrCreateCustomerId({ user })
    if (idError || !customerId) {
      throw idError || new Error("Failed to get or create customer ID.")
    }

    // 4. create a Billing Portal session in Stripe (test mode is fine)
    const returnUrl = new URL("/account/billing", url.origin).toString()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    console.info("[billing/manage] redirect → portal", {
      url: portalSession?.url ? "[ok]" : "[missing]",
      customerId: maskId(customerId),
    })

    // 5. send browser to Stripe's hosted portal
    const destination = portalSession?.url ?? "/account/billing"
    throw redirect(303, destination)
  } catch (e) {
    // IMPORTANT:
    // SvelteKit implements redirect() by throwing a special object
    // { status: 303, location: "https://..." }.
    // Our try/catch will catch it, so we need to rethrow it unchanged
    // instead of treating it like a "real" error.
    if (isSvelteKitRedirect(e)) {
      // Let the framework actually perform the redirect.
      throw e
    }

    // Anything else IS a real error. Log & report it.
    console.error("[billing/manage] portal error", e, {
      customerId: maskId((e as any)?.customerId),
    })

    // Send telemetry to License Manager / backend so you get visibility.
    await reportWebsiteError(e, user)

    // Show friendly Houston/PSE page to the user.
    throw error(500, {
      message: "Unknown error (PSE). If issue persists, please contact us.",
    })
  }
}
