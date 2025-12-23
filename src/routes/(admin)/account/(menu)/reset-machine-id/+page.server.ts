// src/routes/(admin)/account/(menu)/reset-machine-id/+page.server.ts
import { fail, redirect } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import type { Actions, PageServerLoad } from "./$types"
import { sendAdminEmail } from "$lib/mailer"
import { lmFetch } from "$lib/server/subscription"
import { allProducts, type Product } from "$lib/data/products"
import type { LMEntitlement } from "$lib/types"
import { loadSubscriptionState } from "$lib/server/subscriptionLoader"

// --- Surface entitlements + resolved product names for display ---
const normalize = (s?: string | null) => (s ?? "").trim().toLowerCase()
type ProductWithStripe = Product & {
  stripe_product_id?: string | null
  stripe_price_id?: string | null
}

const byStripeProduct = new Map<string, Product>()
const byStripePrice = new Map<string, Product>()
const byInternalId = new Map<string, Product>()

// Build lookup maps (first-wins to avoid hidden/duplicate variants reordering)
for (const p of allProducts) {
  const ps = p as ProductWithStripe
  if (ps.stripe_product_id) {
    const k = normalize(ps.stripe_product_id)
    if (k && !byStripeProduct.has(k)) byStripeProduct.set(k, p)
  }
  if (ps.stripe_price_id) {
    const k = normalize(ps.stripe_price_id)
    if (k && !byStripePrice.has(k)) byStripePrice.set(k, p)
  }
  const k = normalize(p.id)
  if (k && !byInternalId.has(k)) byInternalId.set(k, p)
}

function resolveProduct(
  product_identifier?: string | null,
  tier_identifier?: string | null,
): Product | undefined {
  const a = normalize(product_identifier)
  const b = normalize(tier_identifier)
  return (
    (a &&
      (byStripeProduct.get(a) ||
        byStripePrice.get(a) ||
        byInternalId.get(a))) ||
    (b &&
      (byStripeProduct.get(b) ||
        byStripePrice.get(b) ||
        byInternalId.get(b))) ||
    undefined
  )
}

export type LicenseRow = LMEntitlement & {
  product_name: string
}

export const load: PageServerLoad = async (event) => {
  const { subscriptionState } = await loadSubscriptionState(event)
  const entitlements = (subscriptionState?.entitlements ??
    []) as LMEntitlement[]

  // Build rows with resolved product names
  const licenses: LicenseRow[] = entitlements.map((e) => {
    const prod = resolveProduct(e.product_identifier, e.tier_identifier)
    const product_name =
      prod?.name ||
      e.product_identifier ||
      e.tier_identifier ||
      "Unknown product"
    return { ...e, product_name }
  })

  // --- Canonical ordering ---
  const productOrder = new Map<string, number>()
  allProducts.forEach((p, idx) => {
    if (!productOrder.has(p.id)) productOrder.set(p.id, idx)
  })

  const sorted = licenses
    .map((row) => {
      const prod = resolveProduct(row.product_identifier, row.tier_identifier)
      const idx =
        prod?.id && productOrder.has(prod.id)
          ? (productOrder.get(prod.id) as number)
          : Number.POSITIVE_INFINITY
      return { __idx: idx, row }
    })
    .sort((a, b) => {
      const byProductOrder = a.__idx - b.__idx
      if (byProductOrder !== 0) return byProductOrder
      const ak = a.row.license_key ?? ""
      const bk = b.row.license_key ?? ""
      return ak.localeCompare(bk)
    })
    .map((x) => x.row)

  return {
    entitlements: entitlements as any[],
    licenses: sorted,
    lmError: subscriptionState?.lmError ?? null,
  }
}

/* ---------------------------------------------
   Lightweight, in-memory rate limiter
   - reset: 1 request / 60s per user; 3 / 60s per IP
   - ticket: 2 requests / 60s per user; 6 / 60s per IP
----------------------------------------------*/
const _resetBuckets = new Map<string, number[]>()

function _isAllowed(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const pruned = (_resetBuckets.get(key) ?? []).filter(
    (ts) => now - ts < windowMs,
  )
  if (pruned.length >= limit) {
    _resetBuckets.set(key, pruned)
    return false
  }
  pruned.push(now)
  _resetBuckets.set(key, pruned)
  return true
}

// Small helpers
function _deriveClientIp(
  request: Request,
  locals: unknown,
  getClientAddress?: () => string,
) {
  const headerIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined

  return (
    (locals as any).clientIp ??
    (typeof getClientAddress === "function" ? getClientAddress() : undefined) ??
    headerIp ??
    "0.0.0.0"
  )
}

function _nextAllowedFrom(body: any): string | null {
  const nextAtFromBody: string | null =
    body?.next_allowed_reset_at ??
    (typeof body?.retry_after_seconds === "number"
      ? new Date(Date.now() + body.retry_after_seconds * 1000).toISOString()
      : null)
  return nextAtFromBody ?? null
}

// --- Named helpers -----------------------------------------------------------
type ActionEvent = Parameters<Actions["reset"]>[0]

async function doReset({ request, locals, getClientAddress }: ActionEvent) {
  const user = (locals as any).user
  if (!user)
    return fail(401, { error: "Authentication required. Please log in." })

  const formData = await request.formData()
  const licenseKey = (formData.get("licenseKey") as string)?.trim()
  if (!licenseKey) return fail(400, { error: "License Key is required." })

  const email: string = user.email ?? ""
  if (!email) {
    return fail(400, {
      error:
        "Your account email is missing. Please update it in your settings.",
      licenseKey,
    })
  }

  // reset limiter: 1/min per user, 3/min per IP
  const ip = _deriveClientIp(request, locals, getClientAddress)
  if (
    !_isAllowed(`reset:user:${user.id}`, 1, 60_000) ||
    !_isAllowed(`reset:ip:${ip}`, 3, 60_000)
  ) {
    return fail(429, {
      error: "Too many reset attempts. Please wait a minute and try again.",
      licenseKey,
    })
  }

  const baseUrl = env.PRIVATE_LICENSE_MANAGER_URL
  const apiKey =
    env.PRIVATE_LM_INTERNAL_API_KEY || env.PRIVATE_LICENSE_MANAGER_API_KEY
  if (!baseUrl || !apiKey) {
    console.error(
      "[reset-machine-id] CRITICAL: Missing PRIVATE_LICENSE_MANAGER_URL or API key",
    )
    return fail(500, {
      error:
        "The self-service portal is temporarily unavailable. Please contact support.",
      licenseKey,
    })
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/v1/internal/users/public/reset-activations`

  try {
    const res = await lmFetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Internal-API-Key": String(apiKey),
        "X-Forwarded-For": ip,
        "X-Request-ID": (locals as any).requestId ?? "",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ license_key: licenseKey, email }),
      firstTimeoutMs: 2000,
      retryTimeoutMs: 3000,
    })

    let raw = ""
    try {
      raw = await res.text()
    } catch {
      raw = ""
    }

    let body: any = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      body = null
    }

    if (!res.ok || !body) {
      const detail =
        body?.detail ||
        body?.message ||
        raw ||
        `License server error (HTTP ${res.status}).`
      return fail(res.status, { error: detail, licenseKey })
    }

    const nextAllowedAt = _nextAllowedFrom(body)

    if (body?.status === "success") {
      return {
        success: true,
        message: body?.message,
        licenseKey,
        nextAllowedAt,
      }
    }

    return fail(400, { error: body?.message, licenseKey, nextAllowedAt })
  } catch (error) {
    console.error("Machine ID Reset Server Error:", error)
    return fail(500, {
      error: "Could not connect to the license server. Please try again later.",
      licenseKey,
    })
  }
}

async function doTicket({ request, locals, getClientAddress }: ActionEvent) {
  const user = (locals as any).user
  if (!user)
    return fail(401, { error: "Authentication required. Please log in." })

  const formData = await request.formData()
  const licenseKey = (formData.get("licenseKey") as string)?.trim()
  if (!licenseKey) return fail(400, { error: "License Key is required." })

  const ip = _deriveClientIp(request, locals, getClientAddress)

  // ticket limiter: 2/min per user, 6/min per IP
  if (
    !_isAllowed(`ticket:user:${user.id}`, 2, 60_000) ||
    !_isAllowed(`ticket:ip:${ip}`, 6, 60_000)
  ) {
    return fail(429, {
      error: "Too many ticket requests. Please try again in a minute.",
      licenseKey,
    })
  }

  const to = env.PRIVATE_MACHINE_RESET_EMAIL || env.PRIVATE_ADMIN_EMAIL
  try {
    if (!to) {
      console.warn(
        "[reset-machine-id] No admin email configured; logging ticket instead.",
      )
    } else {
      await sendAdminEmail({
        toEmail: to,
        subject: `Manual Machine Reset Request • ${user.email}`,
        body:
          `User: ${user.id} (${user.email})\n` +
          `License: ${licenseKey}\n` +
          `Reason: User requested early reset within cooldown window.\n` +
          `Route-To: ${to}\n` +
          `Request-Id: ${(locals as any).requestId ?? "n/a"}`,
      })
    }
    return { ticket: true, licenseKey }
  } catch (err) {
    console.error("[reset-machine-id] sendAdminEmail failed:", err)
    return {
      ticket: true,
      licenseKey,
      message:
        "We logged your request. If you don’t see an email, please contact machineReset@signallynx.com.",
    }
  }
}

export const actions: Actions = {
  // NEW: let this page trigger a claim-by-email like the Downloads page
  refresh: async ({ cookies, locals, getClientAddress }) => {
    // allow a fresh claim attempt in the layout
    cookies.delete("lm_claim_check", { path: "/" })

    try {
      const user = (locals as any)?.user
      if (user?.email && user?.id) {
        const ip =
          (locals as any)?.clientIp ??
          (typeof getClientAddress === "function"
            ? getClientAddress()
            : undefined) ??
          "0.0.0.0"

        const lmBase = env.PRIVATE_LICENSE_MANAGER_URL?.replace(/\/+$/, "")
        const lmKey =
          env.PRIVATE_LM_INTERNAL_API_KEY || env.PRIVATE_LICENSE_MANAGER_API_KEY
        if (lmBase && lmKey) {
          const ctrl = new AbortController()
          const to = setTimeout(() => ctrl.abort(), 8000)

          fetch(`${lmBase}/api/v1/internal/licenses/claim-by-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-API-Key": lmKey,
              "X-Forwarded-For": ip,
              "X-Request-ID": (locals as any)?.requestId ?? "",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({
              supabase_user_id: user.id,
              email: user.email,
            }),
            signal: ctrl.signal,
            cache: "no-store",
          })
            .then(async (r) => {
              if (!r.ok) {
                console.error(
                  `[Claim License] LM API Error: ${r.status} ${await r.text()}`,
                )
              }
            })
            .catch((e) => {
              console.error(
                `[Claim License] Failed to connect to LM for license claim: ${e}`,
              )
            })
            .finally(() => clearTimeout(to))
        } else {
          console.error("[Claim License] Missing LM env; skipping claim.")
        }
      }
    } catch (e) {
      console.error(`[Claim License] Unexpected error during refresh: ${e}`)
    }

    // bounce back here; layout will fetch fresh entitlements
    throw redirect(303, "/account/reset-machine-id?refreshed=true")
  },

  reset: doReset,
  requestManual: doTicket,
}
