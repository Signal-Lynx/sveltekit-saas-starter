// src/routes/(marketing)/login/forgot_password/+page.server.ts
import { fail } from "@sveltejs/kit"
import type { Actions } from "./$types"

/**
 * NOTE ON BEHAVIOR (unchanged from original):
 * - On validation error: returns fail(400, { email, error })
 * - On request (regardless of Supabase outcome): returns { success: true }
 *   This intentionally prevents email enumeration.
 */

// ---------- Validation Types & Helpers ----------

type ValidationRule = {
  required?: boolean
  type?: "email"
}

type Schema = Record<string, ValidationRule>

/** Simple, precompiled email pattern for basic validation */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Normalize user input for emails (trim + lowercase) */
function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

/**
 * Validate form data against a schema.
 * Returns normalized data and a single error per field (first hit wins).
 */
function validateForm(formData: FormData, schema: Schema) {
  const errors: Record<string, string> = Object.create(null)
  const data: Record<string, string> = Object.create(null)

  for (const field in schema) {
    const rules = schema[field]
    // Currently we only have an "email" field; normalization is safe and expected.
    const raw = formData.get(field)?.toString()
    const value = field === "email" ? normalizeEmail(raw) : (raw ?? "").trim()

    data[field] = value

    if (rules.required && !value) {
      // Preserve exact original message for the email field
      errors[field] =
        field === "email" ? "Email is required." : "This field is required."
      continue
    }

    if (value && rules.type === "email" && !EMAIL_RE.test(value)) {
      // Preserve exact original message for the email field
      errors[field] = "Please enter a valid email address."
    }
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 }
}

const forgotPasswordSchema: Schema = Object.freeze({
  email: { required: true, type: "email" },
})

// ---------- Actions ----------

export const actions: Actions = {
  requestPasswordReset: async ({ request, locals: { supabase }, url }) => {
    // Parse and validate input
    const formData = await request.formData()
    const { errors, data, isValid } = validateForm(
      formData,
      forgotPasswordSchema,
    )

    if (!isValid) {
      // Preserve original failure shape and status code
      return fail(400, { email: data.email, error: errors.email })
    }

    // Build redirect URL safely (identical destination as original)
    const redirectToUrl = new URL("/auth/callback", url.origin)
    redirectToUrl.searchParams.set("next", "/account/settings/reset_password")

    try {
      // Attempt password reset email with Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectToUrl.href,
      })

      if (error) {
        // Do not leak enumeration hints to client; log server-side only.
        console.error(
          "Password reset error (suppressed from client):",
          error.message,
        )
      }
    } catch (err) {
      // Any unexpected error is also suppressed to the client
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Unknown error"
      console.error("Password reset unexpected error (suppressed):", msg)
      // Intentionally fall through to success response to avoid enumeration.
    }

    // CRITICAL: Always return success to prevent email enumeration attacks.
    return { success: true }
  },
}
