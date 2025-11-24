// src/routes/(internal)/admin/+page.server.ts
import type { Actions, PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import {
  getMRRDailies,
  getMRRMonthlies,
  recomputeTodayMRR,
  getSummary,
} from "$lib/server/admin/metrics"
import { env as privateEnv } from "$env/dynamic/private"
import { env as publicEnv } from "$env/dynamic/public"

/** Internal helpers kept local to this module for clarity and testability */
type Scope = "mapped" | "allowlist" | "all"
const ALLOWED_SCOPES: ReadonlySet<Scope> = new Set([
  "mapped",
  "allowlist",
  "all",
])

/**
 * Determine Stripe mode. If the key is missing, default to "test" rather than throwing,
 * which keeps the page resilient in non-secret/dev environments.
 */
function getStripeMode(key: string | undefined): "test" | "live" {
  if (!key) return "test"
  return key.startsWith("sk_test_") ? "test" : "live"
}

/** Normalize and count comma/newline/whitespace-separated IDs, ignoring empties/dupes */
function countAllowlist(raw: string | undefined): number {
  if (!raw) return 0
  const parts = raw
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
  return new Set(parts).size
}

/** Parse and clamp the PUBLIC_ADMIN_MRR_SCOPE to the allowed set with a safe default */
function parseScope(v: string | undefined): Scope {
  const s = (v ?? "mapped").toLowerCase() as Scope
  return ALLOWED_SCOPES.has(s) ? s : "mapped"
}

export const load: PageServerLoad = async () => {
  // Fetch admin metrics only (Stripe Pulse is fetched client-side)
  const [daily, monthly, summary] = await Promise.all([
    getMRRDailies(90),
    getMRRMonthlies(12),
    getSummary(),
  ])

  const stripe_mode = getStripeMode(privateEnv.PRIVATE_STRIPE_API_KEY)
  const scope = parseScope(publicEnv.PUBLIC_ADMIN_MRR_SCOPE)

  // Prefer product IDs; fall back to price IDs (matches original behavior)
  const allowlistRaw =
    privateEnv.PRIVATE_STRIPE_PRODUCT_IDS ??
    privateEnv.PRIVATE_STRIPE_PRICE_IDS ??
    ""
  const allowlistCount = countAllowlist(allowlistRaw)

  // No stripePulse here; client will fetch it via /api/admin/stripe-pulse
  return { daily, monthly, summary, stripe_mode, scope, allowlistCount }
}

export const actions: Actions = {
  refresh_mrr: async () => {
    try {
      const r = await recomputeTodayMRR()
      const day = (r as Record<string, unknown>)?.day ?? ""
      throw redirect(
        303,
        `/admin?ok=recomputed_${encodeURIComponent(String(day))}`,
      )
    } catch (err: unknown) {
      // Let SvelteKit redirects bubble
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        "location" in err
      ) {
        throw err as never
      }
      const message = err instanceof Error ? err.message : "refresh_failed"
      console.error("[admin.refresh_mrr] failed", { message })
      throw redirect(303, `/admin?error=${encodeURIComponent(message)}`)
    }
  },
} satisfies Actions
