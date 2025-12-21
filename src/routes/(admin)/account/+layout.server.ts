// src/routes/(admin)/account/+layout.server.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { redirect } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { lmFetch } from "$lib/server/subscription"
import type { LayoutServerLoad } from "./$types"

/**
 * This layout is the primary guard for all /account pages.
 * Its responsibilities are to:
 * 1. Ensure the user is authenticated.
 * 2. Fetch the user's basic profile data.
 * 3. NEW: Automatically sync licenses (claim-by-email) if needed.
 */
export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
  const { user } = locals

  // 1. Authentication Guard
  if (!user) {
    console.warn("[account guard] no user → /login", { path: url.pathname })
    throw redirect(
      303,
      `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
    )
  }

  // 2. Fetch Profile
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error("[account guard] profile fetch error", {
      userId: user.id,
      errorMessage: error.message,
    })
  }

  // 3. Auto-Claim Logic (Sync licenses on session start or after purchase)
  // We use a cookie to ensure this runs only once per session/hour, not on every click.
  // The 'purchase-success' page deletes this cookie to force a refresh.
  const SYNC_COOKIE = "lm_claim_check"
  if (user.email && !cookies.get(SYNC_COOKIE)) {
    try {
      const lmBase = env.PRIVATE_LICENSE_MANAGER_URL?.replace(/\/+$/, "")
      const lmKey =
        env.PRIVATE_LM_INTERNAL_API_KEY || env.PRIVATE_LICENSE_MANAGER_API_KEY

      if (lmBase && lmKey) {
        // Fire the claim request. We await it so the page loads with correct data.
        // Short timeout (1.5s) ensures we don't hang the page load if LM is slow.
        await lmFetch(`${lmBase}/api/v1/internal/licenses/claim-by-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": lmKey,
            "X-Request-ID": locals.requestId,
            // "ngrok-skip-browser-warning": "true", // Uncomment if testing with Ngrok free tier
          },
          body: JSON.stringify({
            supabase_user_id: user.id,
            email: user.email,
          }),
          firstTimeoutMs: 1500,
          retryTimeoutMs: 0, // No retries to keep navigation snappy
        })
      }

      // Set cookie to skip this check for the next hour
      cookies.set(SYNC_COOKIE, "true", {
        path: "/",
        maxAge: 3600, // 1 hour
        httpOnly: true,
        sameSite: "lax",
        secure: url.protocol === "https:",
      })
    } catch (err) {
      // Log failure but DO NOT crash the page. The user can still hit "Refresh" manually.
      console.warn("[Auto-Claim] Background sync failed (non-fatal):", err)
    }
  }

  return {
    session: null,
    user,
    profile: data ?? null,
  }
}
