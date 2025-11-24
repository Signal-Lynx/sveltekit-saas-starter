// src/routes/(marketing)/access/+page.server.ts
import { fail, redirect, type Actions } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { createHash, timingSafeEqual } from "node:crypto"

/**
 * Constant-time string comparison using sha256 digests so we don't leak timing
 * even when lengths differ. This keeps the observable behavior identical while
 * being safer than a naive equality check.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const dh1 = createHash("sha256").update(a, "utf8").digest()
  const dh2 = createHash("sha256").update(b, "utf8").digest()
  return timingSafeEqual(dh1, dh2)
}

type GateType = "site" | "purchase"

const COOKIE = {
  site: "site_access_granted",
  purchase: "purchase_access_granted",
} as const

/**
 * Only allow relative, same-origin paths; fall back to "/".
 * Disallows "//example.com" and other protocol-relative tricks.
 */
function sanitizeNext(url: URL): string {
  const nextParam = url.searchParams.get("next") ?? "/"
  return nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/"
}

/** Shared cookie options with secure set based on protocol. */
function cookieBase(url: URL) {
  const isHttps = url.protocol === "https:"
  return {
    path: "/",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
  }
}

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    // --- Cookie hygiene: clear known legacy/path-scoped variants (no-ops if absent) ---
    cookies.delete(COOKIE.site, { path: "/access" })
    cookies.delete(COOKIE.site, { path: "/account" })
    cookies.delete(COOKIE.purchase, { path: "/access" })
    cookies.delete(COOKIE.purchase, { path: "/account" })

    const formData = await request.formData()

    // Normalize inputs
    const password = (formData.get("password")?.toString() ?? "").trim()
    const rawGate = (formData.get("gateType")?.toString() ?? "").trim()
    const gateType: GateType = rawGate === "purchase" ? "purchase" : "site"

    const next = sanitizeNext(url)
    const baseCookie = cookieBase(url)

    // --- SITE GATE ---
    if (gateType === "site") {
      const configured = env.PRIVATE_SITE_ACCESS_PASSWORD ?? ""
      if (password && configured && constantTimeEquals(password, configured)) {
        cookies.set(COOKIE.site, "true", {
          ...baseCookie,
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        if (process.env.NODE_ENV !== "production") {
          console.info("[access action] site gate PASSED; redirecting to", next)
        }
        throw redirect(303, next)
      }
      return fail(401, { error: "Access Denied. Invalid passphrase." })
    }

    // --- PURCHASE GATE ---
    if (gateType === "purchase") {
      const configured = env.PRIVATE_BETA_PURCHASE_PASSWORD ?? ""
      if (!configured) {
        return fail(403, { error: "Purchase gate is disabled." })
      }
      if (password && constantTimeEquals(password, configured)) {
        cookies.set(COOKIE.purchase, "true", {
          ...baseCookie,
          maxAge: 60 * 30, // 30 minutes to complete purchase
        })
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[access action] purchase gate PASSED; redirecting to",
            next,
          )
        }
        throw redirect(303, next)
      }
      return fail(401, { error: "Access Denied. Invalid passphrase." })
    }

    // Fallback (shouldn't be hit due to defaulting to 'site')
    return fail(400, { error: "Unsupported gate." })
  },
}
