// src/lib/server/turnstile.ts

import { env } from "$env/dynamic/private"

/**
 * Gets the client's IP address from the request headers.
 * @param request The SvelteKit request object.
 * @returns The client's IP address or null.
 */
function getClientIp(request: Request): string | null {
  const h = request.headers
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
  )
}

/**
 * Verifies a Cloudflare Turnstile token from a form submission.
 * @param request The SvelteKit request object.
 * @returns An object indicating success or failure.
 */
export async function verifyTurnstile(
  request: Request,
): Promise<{ ok: boolean; reason: string }> {
  const secret = env.PRIVATE_TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn(
      "[Turnstile] Secret key is not set. Skipping verification in dev mode.",
    )
    return { ok: true, reason: "Not configured." }
  }

  let token: string | undefined
  try {
    const formData = await request.clone().formData()
    token = formData.get("cf-turnstile-response")?.toString()
  } catch {
    // If the body was already consumed elsewhere, avoid a 500 and return a clean failure.
    return {
      ok: false,
      reason:
        "Unable to read CAPTCHA token (request was already processed). Please retry.",
    }
  }

  if (!token) {
    return {
      ok: false,
      reason:
        "CAPTCHA response missing. Please complete the challenge and try again.",
    }
  }

  const ip = getClientIp(request)
  const verificationURL =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify"

  const body = new FormData()
  body.append("secret", secret)
  body.append("response", token)
  if (ip) {
    body.append("remoteip", ip)
  }

  try {
    const response = await fetch(verificationURL, { method: "POST", body })
    if (!response.ok) {
      throw new Error(`Failed to contact Turnstile API: ${response.status}`)
    }
    const data = (await response.json()) as {
      success: boolean
      "error-codes"?: string[]
    }

    if (data.success) {
      return { ok: true, reason: "Success." }
    }

    console.warn("Turnstile verification failed:", data)
    return {
      ok: false,
      reason: "CAPTCHA verification failed. Please try again.",
    }
  } catch (error) {
    console.error("Error verifying Turnstile token:", error)
    return {
      ok: false,
      reason: "There was an error communicating with the CAPTCHA service.",
    }
  }
}
