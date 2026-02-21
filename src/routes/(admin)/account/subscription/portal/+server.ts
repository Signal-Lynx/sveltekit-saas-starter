// src/routes/(admin)/account/subscription/portal/+server.ts
import { json, redirect } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { env } from "$env/dynamic/private"
import { WebsiteBaseUrl } from "../../../../../config"
import Stripe from "stripe"
import { getOrCreateCustomerId } from "$lib/server/subscription_helpers"

// ---------- Stripe singleton (avoids HMR re-inits) ----------
let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  const key = env.PRIVATE_STRIPE_API_KEY
  if (!key) throw new Error("Missing PRIVATE_STRIPE_API_KEY")
  if (stripeClient) return stripeClient
  stripeClient = new Stripe(key, { apiVersion: "2026-01-28.clover" })
  return stripeClient
}

// ---------- Small helpers ----------
function buildReturnUrl(origin: string): string {
  const base = WebsiteBaseUrl || origin
  return new URL("/account/billing", base).toString()
}

// Prefer client-provided key; otherwise use a short time bucket to dedupe double-clicks/retries
function computeIdempotencyKey(
  userId: string,
  provided?: string | null,
): string {
  if (provided && provided.trim()) return provided.trim()
  const bucket = Math.floor(Date.now() / 1000 / 15) // 15s window
  return `bp:${userId}:${bucket}`
}

// Simple structured logs without changing runtime deps
type Ctx = Record<string, unknown>
function logInfo(msg: string, ctx?: Ctx) {
  if (ctx) console.log("[Billing Portal]", msg, ctx)
  else console.log("[Billing Portal]", msg)
}
function logError(msg: string, ctx?: Ctx) {
  if (ctx) console.error("[Billing Portal]", msg, ctx)
  else console.error("[Billing Portal]", msg)
}

// Narrow type for Stripe-like errors without depending on SDK internals
function isStripeLikeError(
  e: unknown,
): e is { type?: string; message?: string; code?: string } {
  return typeof e === "object" && e !== null
}

// ---------- Handler ----------
export const POST: RequestHandler = async (event) => {
  const {
    locals: { user, clientIp, requestId },
    request,
    url,
    setHeaders,
  } = event

  if (!user) {
    // Shouldn't happen for /account routes, but keep the safeguard.
    throw redirect(303, "/login")
  }

  // Prevent caching of the portal URL
  setHeaders({ "cache-control": "no-store" })

  // Prepare structured logging context
  const ctx: Ctx = {
    requestId: requestId ?? undefined,
    userId: user.id ?? undefined,
    ip: clientIp ?? undefined,
  }

  // Ensure Stripe is ready
  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch (err) {
    logError("Stripe not configured", { ...ctx, err: (err as Error)?.message })
    return json(
      { error: "Billing is temporarily unavailable. Please contact support." },
      { status: 500 },
    )
  }

  // Lookup (or create) the Stripe customer id
  const { error: idError, customerId } = await getOrCreateCustomerId({ user })
  if (idError || !customerId) {
    logError("Failed to obtain Stripe customer ID", { ...ctx, idError })
    return json(
      {
        error:
          "Could not retrieve your billing information. Please contact support.",
      },
      { status: 500 },
    )
  }

  // Compute idempotency key (honor client header if present)
  const providedKey =
    request.headers.get("idempotency-key") ??
    request.headers.get("Idempotency-Key")
  const idempotencyKey = computeIdempotencyKey(user.id, providedKey)

  logInfo("Creating Stripe Billing Portal session", {
    ...ctx,
    idempotencyKey,
  })

  try {
    const portalSession = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: buildReturnUrl(url.origin),
      },
      { idempotencyKey },
    )

    logInfo("Created Stripe Billing Portal session", {
      ...ctx,
      sessionId: portalSession.id,
    })

    return json({ url: portalSession.url })
  } catch (e) {
    const errCtx: Ctx = { ...ctx, idempotencyKey }
    if (isStripeLikeError(e)) {
      errCtx.type = e.type
      errCtx.code = e.code
      errCtx.message = e.message
    }
    logError("Error creating Stripe Billing Portal session", errCtx)

    return json(
      {
        error:
          "An unexpected error occurred while contacting our billing provider.",
      },
      { status: 500 },
    )
  }
}
