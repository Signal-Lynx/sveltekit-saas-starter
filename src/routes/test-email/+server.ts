// src/routes/test-email/+server.ts
import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { sendTemplatedEmail } from "$lib/mailer"
import { WebsiteBaseUrl, WebsiteName } from "../../config" // keep the corrected import
import { env } from "$env/dynamic/private"

// --- helpers ---------------------------------------------------------------

/** Light email sanity check (kept permissive to avoid false negatives). */
function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Mask an email for logs (e.g., a****@domain.com). */
function maskEmail(email: string) {
  const [user, domain] = email.split("@")
  if (!user || !domain) return email
  const maskedUser =
    user.length > 1
      ? `${user[0]}${"*".repeat(Math.max(1, user.length - 1))}`
      : "*"
  return `${maskedUser}@${domain}`
}

/** Promise timeout wrapper to avoid hanging requests. */
async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label = "operation",
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms} ms`)),
      ms,
    )
  })
  try {
    // Race the operation against the timeout
    const result = await Promise.race([p, timeoutPromise])
    return result as T
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// --- route -----------------------------------------------------------------

export const GET: RequestHandler = async ({ setHeaders }) => {
  // Add cache-busting headers so this endpoint isn't cached by browsers/CDNs.
  setHeaders({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  })

  // Correlation id for log stitching
  const cid = `test-email:${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`

  // The test recipient is now configurable via an environment variable
  const toEmail = env.PRIVATE_TEST_EMAIL_RECIPIENT

  // Source address from env (unchanged)
  const fromEmail = env.PRIVATE_DEFAULT_FROM_EMAIL

  // Validate required config early (before logging recipient details)
  if (!toEmail) {
    console.error(`[${cid}] [Email Test] Missing PRIVATE_TEST_EMAIL_RECIPIENT`)
    return json(
      {
        success: false,
        error:
          "Test email recipient is not configured. Please set PRIVATE_TEST_EMAIL_RECIPIENT in your .env file.",
      },
      { status: 500 },
    )
  }

  console.info(`[${cid}] [Email Test] Attempting to send test email...`)
  console.info(
    `[${cid}] [Email Test] FROM: ${fromEmail ? maskEmail(fromEmail) : "(unset)"}`,
  )
  console.info(`[${cid}] [Email Test] TO: ${maskEmail(toEmail)}`)

  // Validate required config
  if (!fromEmail) {
    console.error(`[${cid}] [Email Test] Missing PRIVATE_DEFAULT_FROM_EMAIL`)
    return json(
      {
        success: false,
        error: "PRIVATE_DEFAULT_FROM_EMAIL is not set in your .env file.",
      },
      { status: 500 },
    )
  }

  // Gentle sanity checks (non-fatal; only warn)
  if (!looksLikeEmail(fromEmail)) {
    console.warn(
      `[${cid}] [Email Test] PRIVATE_DEFAULT_FROM_EMAIL does not look like a valid email`,
    )
  }
  if (!looksLikeEmail(toEmail)) {
    console.warn(
      `[${cid}] [Email Test] Configured test recipient does not look like a valid email`,
    )
  }
  if (!WebsiteName) console.warn(`[${cid}] [Email Test] WebsiteName is empty`)
  if (!WebsiteBaseUrl)
    console.warn(`[${cid}] [Email Test] WebsiteBaseUrl is empty`)

  try {
    const started = performance.now()

    // Keep the same template name and properties as the original
    await withTimeout(
      sendTemplatedEmail({
        to_emails: [toEmail],
        from_email: fromEmail,
        subject: `SES TEST EMAIL from ${WebsiteName}`,
        template_name: "welcome_email",
        template_properties: {
          companyName: WebsiteName,
          WebsiteBaseUrl: WebsiteBaseUrl,
        },
      }),
      20_000, // 20s safety timeout
      "sendTemplatedEmail",
    )

    const elapsed = Math.round(performance.now() - started)
    console.info(`[${cid}] [Email Test] SUCCESS in ${elapsed} ms`)

    // Preserve the success payload shape and message text semantics
    return json({
      success: true,
      message: `Test email sent to ${toEmail}. Check your inbox and terminal logs.`,
    })
  } catch (err: unknown) {
    // Normalize the error message without leaking unexpected shapes
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err)

    console.error(`[${cid}] [Email Test] FAILED: ${errorMessage}`)
    return json({ success: false, error: errorMessage }, { status: 500 })
  }
}
