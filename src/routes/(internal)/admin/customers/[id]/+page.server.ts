// src/routes/(internal)/admin/customers/[id]/+page.server.ts
import type { Actions, PageServerLoad } from "./$types"
import {
  getCustomerSummary,
  toggleUnsubscribed,
  setBeta,
  resetAllMachineIdsForUser,
  sendPlainEmail,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  refundLatestCharge,
  creditNextInvoice,
  issueLicense,
  revokeLicense,
  resyncLicenses,
} from "../../../../../lib/server/admin/customers"
import { audit } from "$lib/server/admin/audit"
import { redirect } from "@sveltejs/kit"

/**
 * Helpers
 */
function requireActorId(locals: App.Locals): string {
  const id = locals?.user?.id
  if (!id) throw redirect(303, "/login")
  return id
}

function ensureUserId(id: string | undefined): string {
  // Keep behavior identical but add conservative normalization
  // without enforcing a specific format that could break existing IDs.
  if (!id) throw redirect(303, "/login")
  return String(id).trim()
}

function toAmountCents(
  raw: FormDataEntryValue | null | undefined,
): number | undefined {
  // Accept "123", "123.45", " 1,234.56 " -> cents
  const s = typeof raw === "string" ? raw.replace(/[, ]+/g, "").trim() : ""
  if (!s) return undefined
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  const cents = Math.round(n * 100)
  return cents >= 0 ? cents : undefined
}

function getFormString(form: FormData, key: string, required = false): string {
  const v = String(form.get(key) ?? "").trim()
  if (required && !v) throw new Error(`missing_${key}`)
  return v
}

function goCustomer(userId: string, query?: string): never {
  const base = `/admin/customers/${encodeURIComponent(userId)}`
  throw redirect(303, query ? `${base}?${query}` : base)
}

/**
 * Load the admin view model for a specific user.
 */
export const load: PageServerLoad = async ({ params }) => {
  const userId = ensureUserId(params.id)
  const summary = await getCustomerSummary(userId)
  return { summary }
}

/**
 * Admin actions for customer management.
 * NOTE: Redirect codes, query param names, and behavior are preserved.
 */
export const actions: Actions = {
  // (A) Email prefs / flags
  toggle_unsubscribed: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const result = await toggleUnsubscribed(userId)
    await audit(actorId, "toggle_unsubscribed", userId, {
      to: result.unsubscribed,
    })
    goCustomer(userId)
  },

  set_beta: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    const enable = String(form.get("enable") ?? "") === "true"

    await setBeta(userId, enable)
    await audit(actorId, "set_beta", userId, { enable })
    goCustomer(userId)
  },

  // (B) Billing portal — handled by GET route /billing-portal now (no action needed)

  // (C) Cancel / pause / resume
  cancel_now: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    try {
      const r = await cancelSubscription(userId, false)
      await audit(actorId, "cancel_subscription", userId, { when: r.when })
      goCustomer(userId, "ok=cancel_now")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  cancel_period_end: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    try {
      const r = await cancelSubscription(userId, true)
      await audit(actorId, "cancel_subscription", userId, { when: r.when })
      goCustomer(userId, "ok=cancel_at_period_end")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  pause: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    try {
      const r = await pauseSubscription(userId)
      await audit(actorId, "pause_subscription", userId, { status: r.status })
      goCustomer(userId, "ok=pause")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  resume: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    try {
      const r = await resumeSubscription(userId)
      await audit(actorId, "resume_subscription", userId, { status: r.status })
      goCustomer(userId, "ok=resume")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  // (D) Refunds & credits
  refund_latest: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    const amountCents = toAmountCents(form.get("amount"))

    try {
      const r = await refundLatestCharge(userId, amountCents)
      await audit(actorId, "refund_latest_charge", userId, {
        amount_cents: r.amount,
      })
      goCustomer(userId, "ok=refund")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  credit_next_invoice: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    const amountCents = toAmountCents(form.get("amount"))
    const memo = getFormString(form, "memo", false)

    if (amountCents === undefined) {
      goCustomer(userId, "error=invalid_amount")
    }

    try {
      const r = await creditNextInvoice(userId, amountCents!, memo)
      await audit(actorId, "credit_next_invoice", userId, {
        amount_cents: amountCents,
        memo,
        id: r.id,
      })
      goCustomer(userId, "ok=credit")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  // (E) License admin hooks
  license_issue: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    let productId: string
    try {
      productId = getFormString(form, "product_id", true)
    } catch {
      goCustomer(userId, "error=missing_product_id")
    }

    try {
      await issueLicense(userId, productId!)
      await audit(actorId, "license_issue", userId, { productId })
      goCustomer(userId, "ok=license_issue")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  license_revoke: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    let licenseKey: string
    try {
      licenseKey = getFormString(form, "license_key", true)
    } catch {
      goCustomer(userId, "error=missing_license_key")
    }

    try {
      await revokeLicense(userId, licenseKey!)
      await audit(actorId, "license_revoke", userId, { licenseKey })
      goCustomer(userId, "ok=license_revoke")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  license_resync: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    try {
      await resyncLicenses(userId)
      await audit(actorId, "license_resync", userId, {})
      goCustomer(userId, "ok=license_resync")
    } catch (e) {
      goCustomer(userId, `error=${encodeURIComponent((e as Error).message)}`)
    }
  },

  // (F) Device reset
  reset_machine_id: async ({ locals, params }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    // 1) Do the LM call. If it fails, redirect with an error key.
    try {
      await resetAllMachineIdsForUser(userId)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "An unknown error occurred during reset."
      console.error(`[Admin Reset Machine ID] Failed for user ${userId}:`, e)
      // Redirect on failure
      goCustomer(userId, `error=${encodeURIComponent(msg)}`)
    }

    // 2) Best-effort audit — do not break success UX on audit issues.
    try {
      await audit(actorId, "reset_machine_id_admin", userId, {
        trigger: "website_admin_panel",
      })
    } catch (auditErr) {
      console.warn("[admin.reset_machine_id] audit failed (non-blocking)", {
        userId,
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
      })
    }

    // 3) Success UX: place redirect OUTSIDE the try/catch so it isn't swallowed.
    goCustomer(userId, "ok=reset_all_machine_ids_successful")
  },

  // (G) Send plain email (no template, no JSON)
  send_email: async ({ locals, params, request }) => {
    const actorId = requireActorId(locals as App.Locals)
    const userId = ensureUserId(params.id)

    const form = await request.formData()
    const subject = getFormString(form, "subject", true)
    const body = getFormString(form, "body", true)

    // 1) Try to send. If this throws, map to a friendly error and redirect.
    try {
      await sendPlainEmail(userId, subject, body)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : JSON.stringify(e)

      // 🔴 New: log the real failure so localhost + Vercel logs are useful
      console.error("[admin.send_email] failed to send customer email", {
        userId,
        subject,
        errorMessage: msg,
        error: e,
      })

      let key = "email_send_failed"
      if (msg === "SES:SEND_FAIL:RECIPIENT_NOT_VERIFIED")
        key = "recipient_not_verified"
      else if (msg === "SES:SEND_FAIL:SENDER_NOT_VERIFIED")
        key = "sender_not_verified"
      else if (msg === "SES:SEND_FAIL:IDENTITY_NOT_VERIFIED")
        key = "identity_not_verified"
      else if (msg === "SES:SEND_FAIL:MESSAGE_REJECTED")
        key = "ses_message_rejected"
      else if (/not verified/i.test(msg)) key = "identity_not_verified"
      else if (/MessageRejected/i.test(msg)) key = "ses_message_rejected"

      // Redirect on error (this throws; do not continue)
      goCustomer(userId, `error=${encodeURIComponent(key)}`)
    }

    // 2) Best-effort audit — failures here should never surface to the user
    try {
      await audit(actorId, "send_email", userId, { kind: "plain" })
    } catch (auditErr) {
      console.warn("[admin.send_email] audit failed (non-blocking)", {
        userId,
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
      })
    }

    // 3) Success UX: place redirect OUTSIDE the try/catch so it isn't swallowed
    goCustomer(userId, "sent=1")
  },
}
