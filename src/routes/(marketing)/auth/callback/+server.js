// src/routes/(marketing)/auth/callback/+server.js
// @ts-check
import { redirect } from "@sveltejs/kit"
import { isAuthApiError } from "@supabase/supabase-js"

/**
 * Extract a safe string message from any error-like value.
 * @param {unknown} err
 */
function errMsg(err) {
  if (err instanceof Error && typeof err.message === "string")
    return err.message
  try {
    // Many libs throw objects; JSON.stringify gives us something readable.
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/**
 * Normalize and sanitize the "next" redirect target to prevent open redirects.
 * - Only allow same-origin, relative paths beginning with a single "/".
 * - Reject protocol-relative ("//..."), backslashes, and empty/whitespace values.
 * - Preserve any query/fragment on the relative path.
 * @param {string | null | undefined} nextRaw
 */
function sanitizeNext(nextRaw) {
  if (!nextRaw) return "/account"
  try {
    const decoded = decodeURIComponent(String(nextRaw)).trim()
    if (!decoded) return "/account"
    // must start with single '/', not '//' (protocol-relative), and contain no backslashes
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\")
    ) {
      return "/account"
    }
    return decoded
  } catch {
    // If decoding fails, fall back safely
    return "/account"
  }
}

/** @type {import("./$types").RequestHandler} */
export const GET = async ({ url, locals: { supabase }, cookies }) => {
  const code = url.searchParams.get("code")
  const nextParam = url.searchParams.get("next")
  const next = sanitizeNext(nextParam)

  // If the IdP returned an OAuth error, log it for observability; behavior unchanged.
  const oauthError = url.searchParams.get("error")
  if (oauthError) {
    console.warn("[auth/callback] provider error", {
      error: oauthError,
      error_description: url.searchParams.get("error_description") ?? null,
    })
  }

  if (code) {
    try {
      console.info("[auth/callback] exchanging code...")
      await supabase.auth.exchangeCodeForSession(code)

      // Post-exchange: best-effort user fetch for logging
      try {
        const { data } = await supabase.auth.getUser()
        const names = cookies.getAll().map((c) => c.name)
        const supaCookies = names.filter((n) => /sb-|supabase|auth/i.test(n))
        console.info("[auth/callback] exchange ok", {
          userId: data?.user?.id ?? null,
          supabaseCookieNames: supaCookies,
        })
      } catch (e) {
        console.warn("[auth/callback] getUser() failed post-exchange", {
          message: errMsg(e),
        })
      }
    } catch (error) {
      if (isAuthApiError(error)) {
        console.warn("[auth/callback] exchange failed", {
          message: errMsg(error),
        })
        // Preserve original behavior: send verified=true hint so login screen can adjust UX.
        throw redirect(303, "/login/sign_in?verified=true")
      }
      // Unknown failures propagate (same as original semantics).
      console.error("[auth/callback] unexpected error during exchange", {
        message: errMsg(error),
      })
      throw error
    }
  }

  // Always redirect (same as original)
  console.info("[auth/callback] sanitized redirect →", next)
  throw redirect(303, next || "/account")
}
