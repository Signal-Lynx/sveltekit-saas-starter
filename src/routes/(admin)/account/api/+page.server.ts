// src/routes/(admin)/account/api/+page.server.ts
import { fail, redirect } from "@sveltejs/kit"
import type { Actions } from "./$types"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"

/**
 * Utility regexes kept simple and readable.
 * These are server-side only and not shipped to the client.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i

// --- START: Reusable Type-Safe Validation Logic ---

type ValidationRule = {
  required?: boolean
  min?: number
  max?: number
  type?: "email" | "url"
  match?: string // Name of another field to match
}

type Schema = Record<string, ValidationRule>

function validateForm(formData: FormData, schema: Schema) {
  const errors: Record<string, string> = {}
  const data: Record<string, string> = {}

  for (const field in schema) {
    const value = formData.get(field)?.toString().trim() ?? ""
    data[field] = value
    const rules = schema[field]

    if (rules.required && !value) {
      errors[field] = "This field is required."
      continue
    }

    if (value) {
      if (typeof rules.min === "number" && value.length < rules.min) {
        errors[field] = `Must be at least ${rules.min} characters.`
      }
      if (typeof rules.max === "number" && value.length > rules.max) {
        errors[field] = `Cannot exceed ${rules.max} characters.`
      }
      if (rules.type === "email" && !EMAIL_RE.test(value)) {
        errors[field] = "Invalid email format."
      }
      if (rules.type === "url" && !URL_RE.test(value)) {
        errors[field] = "Please enter a valid URL."
      }
      if (rules.match && value !== formData.get(rules.match)?.toString()) {
        errors[field] = "The fields do not match."
      }
    }
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 }
}

// Schema for the updateProfile action
const updateProfileSchema: Schema = {
  fullName: { required: false, max: 50 },
  companyName: { required: false, max: 50 },
  website: { required: false, max: 50, type: "url" },
}

// --- END: Reusable Type-Safe Validation Logic ---

// --- Small helpers ---

/** Clamp a form value to a max length and coerce to string */
const clamp = (v: FormDataEntryValue | null, max = 50) =>
  (v?.toString() ?? "").slice(0, max)

/** Normalize website to https:// if user entered a bare domain */
function normalizeWebsite(raw: string): string {
  const val = raw.trim()
  if (!val) return ""
  if (/^https?:\/\//i.test(val)) return val
  return `https://${val}`
}

// --- Helpers from original file, restored for parity ---
const commonPw = new Set([
  "password",
  "123456",
  "123456789",
  "qwerty",
  "12345678",
  "111111",
  "123123",
  "abc123",
  "password1",
  "letmein",
  "admin",
])
const looksBreachedy = (s: string) =>
  /\b(password|qwerty|admin|letmein)\b/i.test(s)
const strongEnough = (s: string) =>
  /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s)

// ------------------------------------------------------------------------------------
// ACTIONS
// ------------------------------------------------------------------------------------

export const actions: Actions = {
  // --- ACTION: toggleEmailSubscription (Unchanged) ---
  toggleEmailSubscription: async ({ locals: { user } }) => {
    if (!user) {
      throw redirect(303, "/login")
    }

    const { data: currentProfile, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("unsubscribed")
      .eq("id", user.id)
      .single()

    if (readErr) {
      console.error("Error reading subscription status", readErr)
      return fail(500, { message: "Failed to update subscription status" })
    }

    const newUnsubscribedStatus = !currentProfile?.unsubscribed

    const { data: updated, error: writeErr } = await supabaseAdmin
      .from("profiles")
      .update({ unsubscribed: newUnsubscribedStatus })
      .eq("id", user.id)
      .select("unsubscribed")
      .single()

    if (writeErr || !updated) {
      console.error("Error updating subscription status", writeErr)
      return fail(500, { message: "Failed to update subscription status" })
    }

    return { unsubscribed: updated.unsubscribed }
  },

  // --- ACTION: updateEmail (Unchanged IO) ---
  updateEmail: async ({ request, locals: { supabase, user } }) => {
    if (!user) {
      throw redirect(303, "/login")
    }

    // Empty try/catch retained for compatibility with original file.
    try {
      // Intentionally empty
    } catch {
      // Hooks define safeGetSession() in this codebase; if missing we continue for compatibility.
    }

    const formData = await request.formData()
    const email = (formData.get("email") as string | null)?.trim() ?? ""

    const isEmail = (v: string) => EMAIL_RE.test(v ?? "")
    if (!isEmail(email)) {
      return fail(400, {
        errorMessage: "Please enter a valid email address.",
        errorFields: ["email"],
        email,
      })
    }

    const COOLDOWN_MS = 10 * 60 * 1000
    let canEnforceCooldown = true
    let lastAt = 0

    try {
      const { data: prof, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("last_email_change_at")
        .eq("id", user.id)
        .single()

      if (profErr) {
        canEnforceCooldown = false
        console.warn(
          "profiles read (cooldown) skipped:",
          profErr?.message ?? profErr,
        )
      } else {
        lastAt = prof?.last_email_change_at
          ? new Date(prof.last_email_change_at).getTime()
          : 0
      }
    } catch (e) {
      canEnforceCooldown = false
      console.warn("profiles read (cooldown) threw; skipping:", e)
    }

    if (canEnforceCooldown && lastAt && Date.now() - lastAt < COOLDOWN_MS) {
      return fail(429, {
        errorMessage:
          "Please wait a few minutes before trying another email change.",
        email,
      })
    }

    // Explicitly redirect to the callback handler so the token is exchanged properly
    const { error: supaErr } = await supabase.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=/account/settings`,
      },
    )
    if (supaErr) {
      console.error("auth.updateUser(email) failed:", supaErr)
      return fail(500, {
        errorMessage:
          "We couldn't start the email change. Please try again shortly.",
        email,
      })
    }

    try {
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ last_email_change_at: new Date().toISOString() })
        .eq("id", user.id)
      if (updErr) {
        console.warn(
          "profiles.last_email_change_at update failed (non-fatal)",
          updErr,
        )
      }
    } catch (e) {
      console.warn("profiles.last_email_change_at update threw (non-fatal)", e)
    }

    return { email }
  },

  // --- ACTION: updatePassword (Unchanged IO) ---
  updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user, amr } = await safeGetSession()
    if (!user) {
      throw redirect(303, "/login")
    }

    const formData = await request.formData()
    const newPassword1 = (formData.get("newPassword1") as string) ?? ""
    const newPassword2 = (formData.get("newPassword2") as string) ?? ""
    const currentPassword = (formData.get("currentPassword") as string) ?? ""

    type AmrRecoveryEntry = { method: string; timestamp: number }

    const recoveryAmr = amr?.find(
      (x): x is AmrRecoveryEntry =>
        typeof x === "object" &&
        x !== null &&
        (x as any).method === "recovery" &&
        typeof (x as any).timestamp === "number",
    )

    const isRecoverySession = !!recoveryAmr && !currentPassword

    if (isRecoverySession && recoveryAmr) {
      const timeSinceLogin = Date.now() - recoveryAmr.timestamp * 1000
      if (timeSinceLogin > 1000 * 60 * 15) {
        return fail(400, {
          errorMessage:
            'Recovery code expired. Please log out, then use "Forgot Password" on the sign in page to reset your password. Codes are valid for 15 minutes.',
          errorFields: [],
          newPassword1,
          newPassword2,
          currentPassword: "",
        })
      }
    }

    if (
      commonPw.has(newPassword1.toLowerCase()) ||
      looksBreachedy(newPassword1)
    ) {
      return fail(400, {
        errorMessage: "Please choose a stronger password.",
        errorFields: ["newPassword1"],
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    if (!strongEnough(newPassword1)) {
      return fail(400, {
        errorMessage: "Password must include upper, lower, and numbers.",
        errorFields: ["newPassword1"],
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    let validationError: string | undefined
    const errorFields: string[] = []

    if (!newPassword1) {
      validationError = "You must type a new password"
      errorFields.push("newPassword1")
    }
    if (!newPassword2) {
      validationError = "You must type the new password twice"
      errorFields.push("newPassword2")
    }
    if (newPassword1.length < 6) {
      validationError = "The new password must be at least 6 characters long"
      errorFields.push("newPassword1")
    }
    if (newPassword1.length > 72) {
      validationError = "The new password can be at most 72 characters long"
      errorFields.push("newPassword1")
    }
    if (newPassword1 !== newPassword2) {
      validationError = "The passwords don't match"
      errorFields.push("newPassword1", "newPassword2")
    }
    if (!currentPassword && !isRecoverySession) {
      validationError =
        "You must include your current password. If you forgot it, sign out then use 'forgot password' on the sign in page."
      errorFields.push("currentPassword")
    }

    if (validationError) {
      return fail(400, {
        errorMessage: validationError,
        errorFields: [...new Set(errorFields)],
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    if (!isRecoverySession) {
      const { error: pwCheckErr } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      })
      if (pwCheckErr) {
        throw redirect(303, "/login/current_password_error")
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword1,
    })
    if (updateErr) {
      console.error("Error updating password", updateErr)
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    throw redirect(303, "/account/settings?pw=updated")
  },

  // --- ACTION: deleteAccount (Unchanged IO) ---
  deleteAccount: async ({ request, locals: { supabase, user } }) => {
    if (!user?.id) {
      throw redirect(303, "/login")
    }

    const formData = await request.formData()
    const currentPassword = (formData.get("currentPassword") as string) ?? ""

    if (!currentPassword) {
      return fail(400, {
        errorMessage:
          "You must provide your current password to delete your account. If you forgot it, sign out then use 'forgot password' on the sign in page.",
        errorFields: ["currentPassword"],
        currentPassword,
      })
    }

    const { error: pwError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    })
    if (pwError) {
      throw redirect(303, "/login/current_password_error")
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id, false)
    if (error) {
      console.error("Error deleting user", error)
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        currentPassword,
      })
    }

    const { error: profDelErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id)
    if (profDelErr) {
      console.warn("profiles delete failed (non-fatal)", profDelErr)
    }

    await supabase.auth.signOut()
    throw redirect(303, "/")
  },

  // --- ACTION: updateProfile (Refactored with prior feedback; IO preserved) ---
  updateProfile: async ({ request, locals: { user } }) => {
    if (!user?.id) {
      throw redirect(303, "/login")
    }

    const formData = await request.formData()

    // 1) Clamp and trim before validation (restores auto-clamping behavior)
    formData.set("fullName", clamp(formData.get("fullName")))
    formData.set("companyName", clamp(formData.get("companyName")))
    formData.set("website", clamp(formData.get("website")))

    // 2) Run reusable validator
    const {
      errors,
      data,
      isValid: initialIsValid,
    } = validateForm(formData, updateProfileSchema)
    let isValid = initialIsValid

    // 3) Specific, helpful required field messages
    if (!data.fullName) errors.fullName = "Name is required"

    // REMOVED: companyName and website required checks.

    // Normalize website and re-validate ONLY if provided
    if (data.website) {
      data.website = normalizeWebsite(data.website)
      if (!URL_RE.test(data.website.trim())) {
        errors.website = "Please enter a valid website."
      } else {
        delete errors.website // ensure we don't keep a stale error
      }
    }

    // Normalize website and re-validate
    if (data.website) {
      data.website = normalizeWebsite(data.website)
      if (!URL_RE.test(data.website.trim())) {
        errors.website = "Please enter a valid website."
      } else {
        delete errors.website // ensure we don't keep a stale error
      }
    }

    // Recalculate validity after custom checks
    isValid = Object.keys(errors).length === 0

    if (!isValid) {
      return fail(400, {
        errorFields: Object.keys(errors),
        ...data,
        errorMessage: Object.values(errors)[0],
      })
    }

    // Read prior profile for unsubscribed parity
    const { data: priorProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    const { data: upserted, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: data.fullName,
        company_name: data.companyName,
        website: data.website,
        updated_at: new Date(), // Date object retained intentionally
        unsubscribed: priorProfile?.unsubscribed ?? false,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error updating profile", error)
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        ...data,
      })
    }

    return {
      fullName: data.fullName,
      companyName: data.companyName,
      website: data.website,
      profile: upserted ?? null,
    }
  },

  // --- ACTION: signout (Unchanged) ---
  signout: async ({ locals: { supabase, user } }) => {
    if (user) {
      await supabase.auth.signOut()
    }
    throw redirect(303, "/")
  },
}
