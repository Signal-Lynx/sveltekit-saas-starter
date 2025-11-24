// src/routes/(admin)/account/+layout.server.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

/**
 * This layout is the primary guard for all /account pages.
 * Its responsibilities are to:
 * 1. Ensure the user is authenticated, redirecting to login if not.
 * 2. Fetch the user's basic profile data.
 *
 * All complex entitlement fetching and license claiming logic has been moved to the
 * child `(menu)/+layout.server.ts` to ensure it only runs on pages that need it
 * and can be re-validated effectively.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { user } = locals

  // 1. Authentication Guard: Protect all /account routes
  if (!user) {
    console.warn("[account guard] no user → /login", { path: url.pathname })
    throw redirect(
      303,
      `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
    )
  }

  // 2. Fetch the user's profile. This data is now available to all child layouts/pages.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    // Log the error but don't crash the page. A user might be newly signed up
    // and not have a profile record yet. The UI should handle a null profile.
    console.error("[account guard] profile fetch error", {
      userId: user.id,
      errorMessage: error.message,
    })
  }

  // Return the essential data for the account section.
  return {
    session: null, // Kept for backward compatibility with any older components expecting it.
    user,
    profile: data ?? null,
  }
}
