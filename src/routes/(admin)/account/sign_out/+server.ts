//src/routes/(admin)/account/sign_out/+server.ts
import { redirect, type RequestHandler } from "@sveltejs/kit"

/**
 * Logs the user out (best-effort) and then redirects to "/".
 * Behavior is intentionally unchanged: always 303 -> "/".
 */
export const POST = (async ({ locals }) => {
  // Supabase client is attached to locals by auth-helpers in your hooks.
  const supabase = (locals as any)?.supabase
  const requestId = (locals as any)?.requestId
  const clientIp = (locals as any)?.clientIp

  try {
    if (!supabase?.auth?.signOut) {
      console.warn("[SignOut] Supabase client missing on locals.", {
        requestId,
        clientIp,
      })
    } else {
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Non-fatal: we still redirect to avoid trapping the user on this page.
        console.warn("[SignOut] supabase.auth.signOut() returned an error.", {
          message: error.message,
          requestId,
          clientIp,
        })
      }
    }
  } catch (err) {
    // Non-fatal: ensure UX remains consistent even if sign-out throws.
    console.error("[SignOut] Unexpected error during sign-out.", {
      err,
      requestId,
      clientIp,
    })
  }

  // Preserve original behavior: always redirect home with 303 See Other.
  throw redirect(303, "/")
}) satisfies RequestHandler
