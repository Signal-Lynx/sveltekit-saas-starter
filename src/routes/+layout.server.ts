// src/routes/+layout.server.ts
import { env } from "$env/dynamic/private"
import type { LayoutServerLoad } from "./$types"

// Ensure no pages are prerendered; hooks always run.
export const prerender = false
// Be explicit that this layout is server-rendered.
export const ssr = true

type AuthData =
  | { signedIn: false }
  | { signedIn: true; userId: string; email: string | null }

function isNonEmptyEnv(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function cookieBoolean(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  // Accept common truthy variants without changing existing behavior for "true"
  return v === "true" || v === "1" || v === "yes"
}

export const load: LayoutServerLoad = async ({ cookies, locals, depends }) => {
  // Invalidate when gate-related state changes
  depends("app:gate")

  const siteGateActive = isNonEmptyEnv(env.PRIVATE_SITE_ACCESS_PASSWORD)
  const siteAccessGranted = cookieBoolean(cookies.get("site_access_granted"))

  const user = locals.user ?? null

  const auth: AuthData = user
    ? { signedIn: true, userId: user.id, email: user.email ?? null }
    : { signedIn: false }

  return {
    siteGateActive,
    siteAccessGranted,
    auth,
    session: locals.session ?? null,
  } satisfies {
    siteGateActive: boolean
    siteAccessGranted: boolean
    auth: AuthData
    // session is intentionally opaque; keep passthrough shape
    session: unknown
  }
}
