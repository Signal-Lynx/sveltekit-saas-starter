// src/lib/server/errorApi.ts
import { env as validated } from "$lib/server/env"
import { lmFetch } from "$lib/server/subscription"

interface WebsiteErrorPayload {
  product_id: string
  client_version?: string
  user_identifier?: string
  error_summary: string
  error_details?: string
}

export async function reportWebsiteError(
  error: unknown,
  user: { id: string; email?: string | null } | null,
) {
  const payload: WebsiteErrorPayload = {
    product_id: "Website",
    user_identifier: user
      ? `${user.id} (${user.email || "no-email"})`
      : "anonymous",
    error_summary: "Unknown Error",
    error_details: "No details available.",
  }

  if (error instanceof Error) {
    payload.error_summary = error.message
    payload.error_details = error.stack || "No stack trace available."
  } else {
    payload.error_summary = "Non-Error object thrown on website"
    try {
      payload.error_details = JSON.stringify(error, null, 2)
    } catch {
      payload.error_details = String(error)
    }
  }

  // ✅ ADDED: Log that we are attempting to report an error
  console.log("[reportWebsiteError] Attempting to report error...", {
    user: user ? user.id : "anonymous",
    summary: payload.error_summary,
  })

  // 🔇 Drop browser extension & MetaMask noise
  {
    const summary = (payload.error_summary || "").toLowerCase()
    const details = (payload.error_details || "").toLowerCase()
    const mentionsExtension =
      summary.includes("chrome-extension://") ||
      details.includes("chrome-extension://")
    const mentionsMetaMask =
      summary.includes("metamask") ||
      details.includes("metamask") ||
      details.includes("inpage.js")

    if (mentionsExtension || mentionsMetaMask) {
      console.log(
        "[reportWebsiteError] Ignoring browser-extension/MetaMask error:",
        {
          summary: payload.error_summary,
        },
      )
      return
    }
  }

  const lmBase = (validated.PRIVATE_LICENSE_MANAGER_URL || "").replace(
    /\/+$/,
    "",
  )
  const lmKey =
    validated.PRIVATE_WEBSITE_ERROR_API_KEY ||
    validated.PRIVATE_LICENSE_MANAGER_API_KEY

  if (!lmBase || !lmKey) {
    // ✅ MODIFIED: More specific log message
    console.error(
      "[reportWebsiteError] CRITICAL: Skipping report. License Manager URL or API key missing.",
    )
    return
  }

  // Primary (correct) endpoint — works with current LM:
  const primaryUrl = `${lmBase}/api/v1/report-website-error`
  // Fallback for older builds you may have run previously:
  const legacyUrl = `${lmBase}/api/v1/internal/errors/report-website-error`

  try {
    let res = await lmFetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": String(lmKey),
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
      firstTimeoutMs: 2000,
      retryTimeoutMs: 3000,
    })

    // If you’re on an older LM that still used the legacy path, retry once there.
    if (res.status === 404) {
      res = await lmFetch(legacyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": String(lmKey),
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
        firstTimeoutMs: 2000,
        retryTimeoutMs: 3000,
      })
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      // ✅ MODIFIED: More specific failure log
      console.error(
        `[reportWebsiteError] FAILED to report. Status: ${res.status}`,
        body.slice(0, 1000),
      )
    } else {
      // ✅ MODIFIED: Explicit success log
      console.log(
        "[reportWebsiteError] SUCCESS: Error reported to License Manager.",
      )
    }
  } catch (e) {
    // ✅ MODIFIED: More specific unhandled exception log
    console.error(
      "[reportWebsiteError] CRITICAL: Unhandled exception during fetch.",
      e,
    )
  }
}
