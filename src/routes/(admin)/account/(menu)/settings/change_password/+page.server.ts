// src/routes/(admin)/account/(menu)/settings/change_password/+page.server.ts
// Handles password reset requests for authenticated users
import type { Actions } from "./$types"

export const actions: Actions = {
  requestPasswordReset: async ({
    locals: { supabase, safeGetSession },
    url,
  }) => {
    try {
      // Defensive: ensure supabase client exists
      if (
        !supabase ||
        typeof supabase.auth?.resetPasswordForEmail !== "function"
      ) {
        console.error("[requestPasswordReset] Supabase client unavailable")
        return {
          error: "Service temporarily unavailable. Please try again.",
        } as const
      }

      // Safely read the current session/user
      const session =
        typeof safeGetSession === "function" ? await safeGetSession() : null
      const userEmail = session?.user?.email ?? null

      if (!userEmail) {
        // Preserve exact message expected by the UI
        return { error: "Not signed in." } as const
      }

      // Build redirect robustly to avoid malformed URLs
      const redirect = new URL("/auth/callback", url)
      redirect.searchParams.set("next", "/account/settings/reset_password")

      // Send the reset email using Supabase (keeps your existing redirect semantics)
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirect.toString(),
      })

      if (error) {
        console.warn("[requestPasswordReset] Supabase error:", error)
        // Keep response schema intact
        return {
          error: "Unable to send reset email. Please try again.",
        } as const
      }

      return { success: true } as const
    } catch (err) {
      console.error("[requestPasswordReset] Unhandled error:", err)
      return { error: "Unexpected error. Please try again." } as const
    }
  },
}
