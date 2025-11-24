// src/routes/(marketing)/login/sign_up/+page.server.ts
import { fail } from "@sveltejs/kit"
import type { Actions } from "./$types"
import { verifyTurnstile } from "$lib/server/turnstile"

// --- Validation Schema (remains the same) ---

type ValidationRule = {
  required?: boolean
  min?: number
  type?: "email"
}

type Schema = Record<string, ValidationRule>

// --- Email helpers (same shape used in forgot_password) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function _validateForm(formData: FormData, schema: Schema) {
  const errors: { [key: string]: string } = {}
  const data: { [key: string]: string } = {}

  for (const field in schema) {
    const raw = formData.get(field)?.toString()
    const value = field === "email" ? normalizeEmail(raw) : (raw ?? "").trim()
    data[field] = value
    const rules = schema[field]

    if (rules.required && !value) {
      if (field === "terms") {
        errors[field] = "You must agree to the Terms of Service."
      } else {
        errors[field] = "This field is required."
      }
      continue
    }

    if (value) {
      if (rules.min && value.length < rules.min) {
        errors[field] = `Password must be at least ${rules.min} characters.`
      }
      if (rules.type === "email" && !EMAIL_RE.test(value)) {
        errors[field] = "Please enter a valid email address."
      }
    }
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 }
}

const _signUpSchema: Schema = {
  email: { required: true, type: "email" },
  password: { required: true, min: 6 },
  terms: { required: true },
}

// --- Corrected Actions ---
export const actions: Actions = {
  signUp: async ({ request, locals: { supabase } }) => {
    const t0 = Date.now()

    // --- CAPTCHA: verify BEFORE reading formData to avoid reusing the body
    const v = await verifyTurnstile(request)
    console.info("[signup] captcha verify:", {
      ok: v.ok,
      ms: Date.now() - t0,
      reason: v.reason,
    })
    if (!v.ok) {
      return fail(400, {
        // we haven't parsed the form yet, so just return the error
        error: v.reason ?? "CAPTCHA verification failed.",
      })
    }

    const formData = await request.formData()
    const email = normalizeEmail(formData.get("email")?.toString())
    const password = (formData.get("password")?.toString() ?? "").trim()
    const termsChecked = (formData.get("terms")?.toString() ?? "") === "on"

    // --- basic validation (unchanged behavior)
    if (!email) {
      return fail(400, { email, error: "Email is required." })
    }
    if (!EMAIL_RE.test(email)) {
      return fail(400, { email, error: "Please enter a valid email address." })
    }
    if (!password || password.length < 6) {
      return fail(400, {
        email,
        error: "Password must be at least 6 characters.",
      })
    }
    if (!termsChecked) {
      return fail(400, {
        email,
        error: "Please confirm you agree to the Terms of Service.",
      })
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          // Redirect through the existing Supabase callback that exchanges the code,
          // then send the user to /account
          emailRedirectTo: new URL(
            "/auth/callback?next=/account",
            request.url,
          ).toString(),
        },
      },
    )

    if (signUpError) {
      console.error("[signup] supabase.auth.signUp error:", {
        message: signUpError.message,
        status: (signUpError as any)?.status,
        name: signUpError.name,
      })
      if (signUpError.message?.toLowerCase().includes("already registered")) {
        return fail(400, {
          email,
          error: "This email is already registered. Please sign in.",
        })
      }
      if (signUpError.message?.toLowerCase().includes("password")) {
        return fail(400, { email, error: signUpError.message })
      }
      return fail(400, {
        email,
        error: "We couldn't create your account. Please try again shortly.",
      })
    }

    console.info("[signup] success:", {
      email,
      userId: signUpData?.user?.id,
      ms: Date.now() - t0,
    })
    return { success: true, email }
  },
}
