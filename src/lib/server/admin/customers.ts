// src/lib/server/admin/customers.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import Stripe from "stripe"
import { env } from "$env/dynamic/private"
import {
  sendTemplatedEmail,
  sendUserPlainEmail as sendPlainEmailDirect,
} from "$lib/mailer"
import { SITE_CONFIG, WebsiteBaseUrl } from "../../../config"
import { getOrCreateCustomerId } from "$lib/server/subscription_helpers"
import {
  getUserSubscriptionState,
  entitlementsToActiveProducts,
  type ActiveProductRow,
} from "$lib/server/subscription"

// ---------- Types ----------

type MinimalProfile = {
  id: string
  email: string | null
}

type ProfileSummary = {
  id: string
  email: string | null
  unsubscribed: boolean | null
  is_beta_tester: boolean | null
}

type SubscriptionSummary = {
  status: Stripe.Subscription.Status | null
  plan: string | null
}

type LicenseSummary = { key: string; status: string }

// ---------- Utilities ----------

/** Require an env var at runtime. Throws if missing. */
function requireEnv<K extends keyof typeof env>(key: K): string {
  const val = env[key]
  if (!val) throw new Error(`Missing required env var: ${key as string}`)
  return val
}

/** Create a single Stripe client (lazy) with a fixed API version. */
let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  const key = requireEnv("PRIVATE_STRIPE_API_KEY")
  if (stripeClient) return stripeClient
  stripeClient = new Stripe(key, { apiVersion: "2023-08-16" })
  return stripeClient
}

/** Normalize/validate a user id. */
function assertUserId(userId: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("A valid userId (string) is required.")
  }
  return userId
}

/** Return an absolute URL for Stripe's return_url. */
function resolveReturnUrl(candidate?: string): string {
  try {
    if (candidate && new URL(candidate).origin) {
      return candidate // already absolute
    }
  } catch {
    // fall through to fallback
  }
  // Fallback to the configured public base URL (never relative)
  return new URL("/", WebsiteBaseUrl).toString()
}

/** Simple timeout wrapper for fetch to avoid hanging requests. */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 20000, ...rest } = init
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

// ---------- Queries ----------

/**
 * Find up to 25 customers whose email contains the provided substring (case-insensitive).
 * Returns [{ id, email }, ...] or [] on error.
 */
export async function searchCustomersByEmail(
  email: string,
): Promise<MinimalProfile[]> {
  const q = (email ?? "").trim()
  if (!q) return []

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .ilike("email", `%${q}%`)
    .limit(25)

  if (error) {
    console.error("searchCustomersByEmail:", error)
    return []
  }
  return (data ?? []) as MinimalProfile[]
}

/**
 * Return a quick customer summary: profile basics, primary subscription (if any), and licenses (stubbed).
 */
export async function getCustomerSummary(userId: string): Promise<{
  profile: ProfileSummary | null
  subscription: SubscriptionSummary
  licenses: LicenseSummary[]
  activeProducts: ActiveProductRow[]
}> {
  const uid = assertUserId(userId)

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, unsubscribed, is_beta_tester")
    .eq("id", uid)
    .single()

  // Default subscription summary
  let subscription: SubscriptionSummary = { status: null, plan: null }

  // Attempt to resolve Stripe customer -> latest/primary subscription
  const { data: sc } = await supabaseAdmin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", uid)
    .single()

  if (sc?.stripe_customer_id) {
    const stripe = getStripe()
    const subs = await stripe.subscriptions.list({
      customer: sc.stripe_customer_id,
      limit: 1,
      expand: ["data.items.data.price"],
    })
    const s = subs.data.at(0)
    subscription = {
      status: (s?.status as Stripe.Subscription.Status | undefined) ?? null,
      plan:
        s?.items?.data?.[0]?.price?.nickname ??
        s?.items?.data?.[0]?.price?.id ??
        null,
    }
  }

  // Licenses & Products via License Manager entitlements
  const subState = await getUserSubscriptionState(
    { id: uid, email: profile?.email ?? null },
    { forceReload: true }, // admin should see the latest state
  )

  const licenses: LicenseSummary[] = (subState.entitlements ?? []).map((e) => ({
    key: e.license_key,
    status: e.status,
  }))

  const activeProducts = entitlementsToActiveProducts(subState.entitlements)

  return {
    profile: (profile as ProfileSummary) ?? null,
    subscription,
    licenses,
    activeProducts, // new field
  }
}

// ---------- Mutations: profile/email ----------

/** Toggle the `unsubscribed` flag for a user's profile and return the new value. */
export async function toggleUnsubscribed(
  userId: string,
): Promise<{ unsubscribed: boolean }> {
  const uid = assertUserId(userId)

  const { data: current, error: readErr } = await supabaseAdmin
    .from("profiles")
    .select("unsubscribed")
    .eq("id", uid)
    .single()

  if (readErr) throw readErr
  const next = !current?.unsubscribed

  const { error: updErr } = await supabaseAdmin
    .from("profiles")
    .update({ unsubscribed: next })
    .eq("id", uid)

  if (updErr) throw updErr
  return { unsubscribed: next }
}

/** Set or unset the `is_beta_tester` flag for a user's profile. */
export async function setBeta(userId: string, enable: boolean): Promise<void> {
  const uid = assertUserId(userId)
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_beta_tester: !!enable })
    .eq("id", uid)

  if (error) throw error
}

// ---------- Stripe helpers (C & D) ----------

async function getStripeCustomerIdOrThrow(userId: string): Promise<string> {
  const uid = assertUserId(userId)
  const { data, error } = await supabaseAdmin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", uid)
    .single()
  if (error || !data?.stripe_customer_id) {
    throw new Error("No Stripe customer id for user.")
  }
  return data.stripe_customer_id
}

/** Resolve a customer's "primary" subscription id, preferring active-like statuses. */
async function getPrimarySubscriptionId(customerId: string): Promise<string> {
  const stripe = getStripe()
  const { data } = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  })

  const preferred = data.find((s) =>
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
      s.status,
    ),
  )
  const chosen = preferred ?? data.at(0)
  if (!chosen?.id) throw new Error("No subscription found for customer.")
  return chosen.id
}

/** Create a Stripe Billing Portal session URL for the user. */
export async function openBillingPortalForUser(
  userId: string,
  returnUrl?: string,
): Promise<string> {
  const uid = assertUserId(userId)

  // 1) Resolve (or create) the Stripe customer ID for the *target* user
  const { customerId, error: idError } = await getOrCreateCustomerId({
    user: { id: uid } as any, // we only need id; helper enriches name/email from profiles
  })
  if (idError || !customerId) {
    const err: any =
      idError instanceof Error
        ? idError
        : new Error("No Stripe customer id for user.")
    err.type ||= "stripe_customer_missing"
    throw err
  }

  // 2) Stripe singleton (avoids HMR/TDZ quirks)
  const stripe = getStripe()

  // 3) Make the call idempotent in case of double-clicks/race-retries
  const bucket = Math.floor(Date.now() / 1000 / 15) // 15s time bucket
  const idempotencyKey = `bp:admin:${uid}:${bucket}`

  // 4) Always pass an absolute return URL (your action already does this)
  const safeReturnUrl = resolveReturnUrl(returnUrl)

  try {
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: safeReturnUrl,
      },
      { idempotencyKey },
    )
    return session.url!
  } catch (e: any) {
    // Normalize Stripe-like errors so the action catch can log something useful
    const norm = new Error(
      (typeof e?.message === "string" && e.message) ||
        "Failed to create Stripe Billing Portal session",
    )
    ;(norm as any).type = e?.type
    ;(norm as any).code = e?.code
    throw norm
  }
}

/**
 * Cancel the user's primary subscription.
 * If `atPeriodEnd` is true, set cancel_at_period_end. Otherwise cancel immediately.
 */
export async function cancelSubscription(
  userId: string,
  atPeriodEnd: boolean,
): Promise<{
  id: string
  status: Stripe.Subscription.Status
  when: "period_end" | "now"
}> {
  const customerId = await getStripeCustomerIdOrThrow(userId)
  const subId = await getPrimarySubscriptionId(customerId)

  const stripe = getStripe()
  if (atPeriodEnd) {
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    })
    return { id: updated.id, status: updated.status, when: "period_end" }
  } else {
    const canceled = await stripe.subscriptions.cancel(subId)
    return { id: canceled.id, status: canceled.status, when: "now" }
  }
}

/** Pause the user's primary subscription (mark uncollectible while paused). */
export async function pauseSubscription(userId: string): Promise<{
  id: string
  status: Stripe.Subscription.Status
}> {
  const customerId = await getStripeCustomerIdOrThrow(userId)
  const subId = await getPrimarySubscriptionId(customerId)
  const stripe = getStripe()
  const updated = await stripe.subscriptions.update(subId, {
    pause_collection: { behavior: "mark_uncollectible" },
  })
  return { id: updated.id, status: updated.status }
}

/** Resume a previously paused subscription by clearing pause_collection. */
export async function resumeSubscription(userId: string): Promise<{
  id: string
  status: Stripe.Subscription.Status
}> {
  const customerId = await getStripeCustomerIdOrThrow(userId)
  const subId = await getPrimarySubscriptionId(customerId)
  const stripe = getStripe()
  const updated = await stripe.subscriptions.update(subId, {
    pause_collection: null,
  })
  return { id: updated.id, status: updated.status }
}

/**
 * Refund the latest paid charge for the user (optionally a partial amount in cents).
 * Returns the refund id and the refunded amount (in cents).
 */
export async function refundLatestCharge(
  userId: string,
  amountCents?: number,
): Promise<{ id: string; amount: number }> {
  const customerId = await getStripeCustomerIdOrThrow(userId)

  // Find the most recent PAID invoice
  const stripe = getStripe()
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 1,
    status: "paid",
    expand: ["data.payment_intent"],
  })

  const inv = invoices.data.at(0)
  if (!inv) throw new Error("No paid invoices to refund.")

  // Determine the charge id from the payment intent (preferred) or invoice.charge
  let chargeId: string | null = null

  if (typeof inv.payment_intent === "string") {
    const pi = await stripe.paymentIntents.retrieve(inv.payment_intent)
    chargeId = (pi.latest_charge as string) ?? null
  } else if (inv.payment_intent && typeof inv.payment_intent === "object") {
    chargeId = (inv.payment_intent.latest_charge as string) ?? null
  }

  if (!chargeId && inv.charge && typeof inv.charge === "string") {
    chargeId = inv.charge
  }

  if (!chargeId) throw new Error("No charge found on latest invoice.")

  const amt =
    typeof amountCents === "number" && amountCents > 0
      ? Math.round(amountCents)
      : undefined

  const refund = await stripe.refunds.create({
    charge: chargeId,
    amount: amt,
  })

  return { id: refund.id, amount: refund.amount }
}

/**
 * Create a negative invoice item (credit) to apply to the user's next invoice.
 * `amountCents` must be > 0.
 */
export async function creditNextInvoice(
  userId: string,
  amountCents: number,
  memo?: string,
): Promise<{ id: string }> {
  if (!amountCents || amountCents <= 0) throw new Error("Amount must be > 0.")
  const customerId = await getStripeCustomerIdOrThrow(userId)

  const stripe = getStripe()
  const ii = await stripe.invoiceItems.create({
    customer: customerId,
    amount: -Math.round(amountCents),
    currency: "usd",
    description: memo || "Admin credit",
  })
  return { id: ii.id }
}

// ---------- License Manager hooks (E) ----------
// These are stubs that you can fill once LM admin endpoints are ready.

export async function listLicensesForUser(
  _userId: string,
): Promise<LicenseSummary[]> {
  // TODO: When LM exposes an admin read endpoint, fetch licenses here.
  return []
}

export async function issueLicense(
  _userId: string,
  _productId: string,
): Promise<never> {
  // Example future call:
  // await fetch(`${PRIVATE_LICENSE_MANAGER_URL}/admin/licenses/issue`, { method: "POST", headers: { "X-Internal-API-Key": PRIVATE_LICENSE_MANAGER_API_KEY } ... })
  throw new Error("License Manager admin issue endpoint not implemented yet.")
}

export async function revokeLicense(
  _userId: string,
  _licenseKey: string,
): Promise<never> {
  throw new Error("License Manager admin revoke endpoint not implemented yet.")
}

export async function resyncLicenses(_userId: string): Promise<never> {
  throw new Error("License Manager admin resync endpoint not implemented yet.")
}

// ---------- LM utility already present ----------

/**
 * Reset the LM machine id for the user by email via internal LM admin endpoint.
 * Throws on failure. Returns void on success.
 */
export async function resetMachineId(userId: string): Promise<void> {
  const uid = assertUserId(userId)
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid)
  const email = data?.user?.email
  if (error || !email) throw new Error("Email not found for user.")

  const url = `${requireEnv(
    "PRIVATE_LICENSE_MANAGER_URL",
  )}/admin/reset-machine-id`

  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": requireEnv("PRIVATE_LICENSE_MANAGER_API_KEY"),
    },
    body: JSON.stringify({ email }),
    timeoutMs: 20000,
  })

  if (!resp.ok) {
    throw new Error(`LM reset failed: ${resp.status} ${await resp.text()}`)
  }
}

/**
 * Canonical-only path; normalize base and surface the exact URL on failure.
 */
export async function resetAllMachineIdsForUser(userId: string): Promise<void> {
  const uid = assertUserId(userId)

  const base = requireEnv("PRIVATE_LICENSE_MANAGER_URL").replace(/\/+$/, "")
  const endpoint = `${base}/api/v1/internal/licenses/reset-activations-by-user-id`

  // Allow either env var name for the internal key (future-proof)
  const apiKey =
    (process.env.PRIVATE_LM_INTERNAL_API_KEY &&
      process.env.PRIVATE_LM_INTERNAL_API_KEY.trim()) ||
    requireEnv("PRIVATE_LICENSE_MANAGER_API_KEY")

  const resp = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": apiKey,
      // optional; harmless if you aren’t on ngrok:
      // "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ supabase_user_id: uid }),
    timeoutMs: 20000,
  })

  if (!resp.ok) {
    // Try to extract useful details without throwing on .text()
    let detail = ""
    try {
      const ct = resp.headers.get("content-type") || ""
      if (ct.includes("application/json")) {
        const j = await resp.json()
        detail = j?.detail || j?.message || JSON.stringify(j)
      } else {
        detail = await resp.text()
      }
    } catch {
      /* ignore parse issues */
    }

    // Add a friendly hint for common auth misconfig
    const hint =
      resp.status === 401 || resp.status === 403
        ? " (check INTERNAL API key / header)"
        : ""

    throw new Error(
      `LM reset failed: ${resp.status} ${detail || ""} (url tried: ${endpoint})${hint}`,
    )
  }
}

/**
 * Send a templated email to the user, enforcing verified email and unsubscribed checks.
 * Throws on failure. Returns void on success.
 */
export async function sendTemplateEmail(
  userId: string,
  templateKey: string,
  subject: string,
  args: Record<string, unknown>,
): Promise<void> {
  const uid = assertUserId(userId)

  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.getUserById(uid)
  const email = authData?.user?.email ?? null
  const emailVerified = Boolean(
    authData?.user?.email_confirmed_at ||
    (authData?.user?.user_metadata as Record<string, unknown> | undefined)
      ?.email_verified,
  )
  if (authErr || !email) throw new Error("Email not found.")
  if (!emailVerified) throw new Error("Email not verified.")

  const { data: prof, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("unsubscribed")
    .eq("id", uid)
    .single()
  if (profErr) throw profErr
  if (prof?.unsubscribed) throw new Error("User is unsubscribed.")

  await sendTemplatedEmail({
    subject: subject || "Message from Support",
    to_emails: [email],
    from_email: SITE_CONFIG.supportEmail, // Using supportEmail as a sensible default
    template_name: templateKey,
    template_properties: args ?? {},
  })
}

export async function sendPlainEmail(
  userId: string,
  subject: string,
  body: string,
): Promise<void> {
  const uid = assertUserId(userId)

  // 1) Resolve verified email
  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.getUserById(uid)
  const email = authData?.user?.email ?? null
  const emailVerified = Boolean(
    authData?.user?.email_confirmed_at ||
    (authData?.user?.user_metadata as Record<string, unknown> | undefined)
      ?.email_verified,
  )
  if (authErr || !email) throw new Error("Email not found.")
  if (!emailVerified) throw new Error("Email not verified.")

  // 2) Check unsubscribe, but allow admin override for direct support emails
  const { data: prof, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("unsubscribed")
    .eq("id", uid)
    .single()

  if (profErr) {
    console.error("[admin.sendPlainEmail] profile lookup failed", {
      userId: uid,
      error: profErr.message ?? String(profErr),
    })
    // Fail closed: this is a real config/data problem
    throw profErr
  }

  if (prof?.unsubscribed) {
    console.warn(
      "[admin.sendPlainEmail] sending email to user marked unsubscribed (admin override)",
      { userId: uid },
    )
    // IMPORTANT: do NOT throw here; admin override is allowed.
  }

  // 3) Pick a from address (keep consistent with your templated send)
  const from =
    env.PRIVATE_DEFAULT_FROM_EMAIL ||
    env.PRIVATE_FROM_ADMIN_EMAIL ||
    env.PRIVATE_ADMIN_EMAIL ||
    SITE_CONFIG.supportEmail
  if (!from) throw new Error("No from address configured.")

  // 4) Send via mailer’s plain email helper (admin override: ignore unsubscribe)
  await sendPlainEmailDirect({
    user: { id: uid, email },
    subject: subject || "Message from Support",
    body,
    from_email: from,
    respectUnsubscribe: false,
  })
}
