// src/routes/(internal)/admin/+layout.server.ts
import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"

/**
 * Narrow types for clarity and future extensibility without changing I/O.
 */
type AdminNavItem = Readonly<{ href: string; label: string }>
type AdminLayoutData = {
  admin: {
    actorId: string
    email: string
  }
  nav: readonly AdminNavItem[]
}

/**
 * Keep the nav model identical in content/shape, but make it immutable to prevent
 * accidental mutations downstream.
 */
const NAV: readonly AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/logs", label: "Audit Log" },
] as const

/**
 * Server load for the admin layout.
 * - Requires authenticated user (from hooks)
 * - Verifies admin flag server-side using Supabase service role
 * - Sets no-store caching for sensitive data
 * - Hides the existence of the portal for non-admins via redirect
 */
export const load = (async ({ locals, setHeaders, depends }) => {
  // Mark this data as dependent on admin session/profile so downstream
  // invalidations can re-run the loader if your hooks/session changes.
  depends?.("app:admin:profile")

  // Never allow caches to store admin layout responses.
  setHeaders?.({
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  })

  // Prefer `locals.user` set by hooks; bail early if not authenticated.
  const u = (locals as App.Locals)?.user ?? null
  if (!u) {
    throw redirect(303, "/login")
  }

  // Fetch only the minimal columns required for authorization + metadata.
  const { data: profile, error: dbErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, is_admin, unsubscribed, is_beta_tester")
    .eq("id", u.id)
    .single()

  // Hide the portal for non-admins or on lookup failure.
  if (dbErr || !profile?.is_admin) {
    // Optional: log server-side for diagnostics without leaking to the client.
    if (dbErr) {
      console.warn("[admin layout] profile lookup failed", {
        user_id: u.id,
        code: dbErr.code,
        hint: dbErr.hint,
        message: dbErr.message,
      })
    }
    throw redirect(303, "/")
  }

  // Keep returned shape/keys identical to the original.
  const data = {
    admin: {
      actorId: profile.id as string,
      email: profile.email as string,
    },
    nav: NAV,
  } satisfies AdminLayoutData

  return data
}) satisfies LayoutServerLoad
