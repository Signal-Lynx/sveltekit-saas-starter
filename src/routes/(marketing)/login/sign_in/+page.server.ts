// src/routes/(marketing)/login/sign_in/+page.server.ts
import { fail, redirect } from "@sveltejs/kit"
import { dev } from "$app/environment"
import { env } from "$env/dynamic/private"
import type { Actions } from "./$types"

// --- START: Validation Schema (kept minimal to avoid behavior changes) ---

type ValidationRule = {
  required?: boolean
  type?: "email" // reserved for future use; not enforced here to preserve behavior
}

type Schema = Record<string, ValidationRule>

type ValidationResult = {
  data: Record<string, string>
  errors: Record<string, string>
  isValid: boolean
}

/**
 * Validates form data against a minimal schema.
 * NOTE: Intentionally does NOT trim the password (and keeps prior behavior of not trimming fields).
 *       We only check "required" to avoid changing functional behavior.
 */
function validateForm(formData: FormData, schema: Schema): ValidationResult {
  const errors: Record<string, string> = {}
  const data: Record<string, string> = {}

  for (const field in schema) {
    // Preserve previous semantics: do not trim values (password in particular).
    const value = formData.get(field)?.toString() ?? ""
    data[field] = value
    const rules = schema[field]

    if (rules.required && !value) {
      // Keep original message semantics for required fields
      errors[field] = "This field is required."
      continue
    }
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 }
}

const signInSchema: Schema = {
  email: { required: true },
  password: { required: true },
}

// --- END: Validation Schema ---

/** Lightly structured dev logging, opt-in via PRIVATE_DEBUG_AUTH=1 */
const DBG_SIGNIN = dev && env.PRIVATE_DEBUG_AUTH === "1"

function dlog(
  level: "info" | "warn" | "error",
  message: string,
  meta?: unknown,
) {
  if (!DBG_SIGNIN) return
  const log = console[level] ?? console.info
  if (meta === undefined) {
    log(`[signIn] ${message}`)
  } else {
    log(`[signIn] ${message}`, meta)
  }
}

type ActionData = {
  email?: string
  error?: string
}

export const actions: Actions = {
  signIn: async ({ request, locals: { supabase }, url, cookies }) => {
    // Parse and validate incoming form data
    const formData = await request.formData()
    const { data, errors, isValid } = validateForm(formData, signInSchema)

    if (!isValid) {
      // Return the first error while preserving the prior response shape
      const firstError = Object.values(errors)[0] ?? "Invalid input."
      return fail<ActionData>(400, { email: data.email, error: firstError })
    }

    dlog("info", "start", { path: url.pathname, email: data.email ?? null })

    // Sign in using Supabase password auth
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      dlog("warn", "supabase error", {
        code: error.name,
        message: error.message,
      })
      // Preserve prior status and payload shape on auth failure
      return fail<ActionData>(401, { email: data.email, error: error.message })
    }

    // Verify identity on the server (used only for dev logs)
    const { data: after } = await supabase.auth.getUser()

    if (dev) {
      const cookieNames = cookies.getAll().map((c) => c.name)
      const supabaseCookieNames = cookieNames.filter((n) =>
        /sb-|supabase|auth/i.test(n),
      )
      dlog("info", "success", {
        userId: after?.user?.id ?? null,
        supabaseCookieNames,
      })
    }

    // Defensive next param handling (kept identical to previous logic/semantics)
    const nextRaw = url.searchParams.get("next") || "/account"
    const redirectTo =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//")
        ? nextRaw
        : "/account"

    throw redirect(303, redirectTo)
  },
}
