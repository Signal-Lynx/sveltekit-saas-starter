// src/routes/(marketing)/contact_us/+page.server.ts
import { fail } from "@sveltejs/kit"
import type { Actions } from "./$types"
import { sendAdminEmail } from "$lib/mailer"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { env } from "$env/dynamic/private"
import { verifyTurnstile } from "$lib/server/turnstile"

// ------------------------------
// Types & constants
// ------------------------------
const FIELDS = [
  "first_name",
  "last_name",
  "email",
  "company",
  "phone",
  "message",
] as const
type Field = (typeof FIELDS)[number]

type ValidationRule = {
  required?: boolean
  min?: number
  max?: number
  type?: "email"
}

const contactSchema: Record<Field, ValidationRule> = {
  first_name: { required: true, min: 2, max: 500 },
  last_name: { required: true, min: 2, max: 500 },
  email: { required: true, min: 6, max: 500, type: "email" },
  company: { max: 500 },
  phone: { max: 100 },
  message: { max: 2000 },
}

// ------------------------------
// Utilities
// ------------------------------
function sanitize(value: unknown): string {
  // Trim, collapse internal whitespace, strip control chars (except newline)
  const s = (value ?? "").toString()
  const noCtl = s
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
  return noCtl.trim()
}

function isValidEmail(email: string): boolean {
  // Reasonable email pattern; avoids catastrophic backtracking
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getClientIp(req: Request): string | null {
  // Prefer well-known proxy headers; fall back to null
  const h = req.headers
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
  )
}

async function _maybeVerifyRecaptcha(
  req: Request,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = env.PRIVATE_RECAPTCHA_SECRET
  if (!secret) return { ok: true } // feature disabled → allow
  // Accept common field names without making them required
  const form = await req.clone().formData()
  const token =
    sanitize(form.get("g-recaptcha-response")) ||
    sanitize(form.get("recaptcha")) ||
    sanitize(form.get("captcha"))
  if (!token) return { ok: false, reason: "Captcha token missing." }

  try {
    const resp = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: getClientIp(req) ?? "",
        }),
      },
    )
    const json = (await resp.json()) as {
      success?: boolean
      score?: number
      action?: string
      "error-codes"?: string[]
    }
    if (!json.success) {
      return { ok: false, reason: `Captcha verification failed.` }
    }
    // If using v3, optionally enforce a score threshold when provided by Google
    const minScore = Number(env.PRIVATE_RECAPTCHA_MIN_SCORE ?? "0")
    if (typeof json.score === "number" && json.score < minScore) {
      return { ok: false, reason: "Captcha score too low." }
    }
    return { ok: true }
  } catch {
    // Network/Google errors → fail closed (safer) but with a clear message
    return { ok: false, reason: "Captcha verification error." }
  }
}

/**
 * Validate + sanitize incoming form values.
 * Returns typed data for the known fields and a flat error bag.
 */
function validateForm(formData: FormData): {
  data: Record<Field, string>
  errors: Partial<Record<Field | "_", string>>
  isValid: boolean
} {
  const errors: Partial<Record<Field | "_", string>> = {}
  const data = {} as Record<Field, string>

  for (const field of FIELDS) {
    const raw = sanitize(formData.get(field))
    data[field] = raw
    const rules = contactSchema[field]

    if (rules.required && !raw) {
      errors[field] = "This field is required."
      continue
    }

    if (!raw) continue

    if (rules.min && raw.length < rules.min) {
      errors[field] = `Must be at least ${rules.min} characters.`
    } else if (rules.max && raw.length > rules.max) {
      errors[field] = `Cannot exceed ${rules.max} characters.`
    } else if (rules.type === "email" && !isValidEmail(raw)) {
      errors[field] = "Invalid email format."
    }
  }

  // Normalize email if present and valid-ish
  if (data.email) data.email = data.email.toLowerCase()

  return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// ------------------------------
// Actions
// ------------------------------
export const actions: Actions = {
  submitContactUs: async ({ request, getClientAddress }) => {
    // CAPTCHA Gate
    const captcha = await verifyTurnstile(request)
    if (!captcha.ok) {
      // Return a general error to avoid leaking specifics
      return fail(400, { errors: { _: captcha.reason } })
    }

    const formData = await request.formData()
    const { errors, data, isValid } = validateForm(formData)

    if (!isValid) {
      return fail(400, { data, errors })
    }

    const userAgent = request.headers.get("user-agent") ?? "unknown"
    const ip = getClientIp(request) ?? getClientAddress?.() ?? "unknown"
    const referer = request.headers.get("referer") ?? "unknown"
    const nowIso = new Date().toISOString()

    try {
      const { error: insertError } = await supabaseAdmin
        .from("contact_requests")
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          company_name: data.company,
          phone: data.phone,
          message_body: data.message,
          updated_at: nowIso,
        })

      if (insertError) {
        console.error("[contact_us] insert error", insertError)
        return fail(500, {
          data,
          errors: { _: "Error saving contact request." },
        })
      }

      const bodyLines = [
        `New contact request from ${data.first_name} ${data.last_name}`,
        "",
        `Email: ${data.email}`,
        `Phone: ${data.phone || "(none)"}`,
        `Company: ${data.company || "(none)"}`,
        "",
        "Message:",
        data.message || "(none)",
        "",
        "--- Diagnostic ---",
        `When: ${nowIso}`,
        `IP: ${ip}`,
        `User-Agent: ${userAgent}`,
        `Referer: ${referer}`,
      ]

      await sendAdminEmail({
        subject: "New contact request",
        body: bodyLines.join("\n"),
      })

      return { success: true }
    } catch (err) {
      console.error("[contact_us] unexpected error", err)
      return fail(500, { data, errors: { _: "Unexpected server error." } })
    }
  },
}
