// FILE: src/lib/mailer.ts (COMPLETE AND FINAL REPLACEMENT v2)

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"
import { env } from "$lib/server/env"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import handlebars from "handlebars"
import { WebsiteName, WebsiteDescription } from "../config"
import { saasstartertheme } from "$lib/theme"

// ---------- Internal helpers (no behavior changes to public API) ----------

/** Guard against header injection in subjects (remove CR/LF). */
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim()
}

/** Basic safety check to prevent path traversal in template names. */
function isSafeTemplateName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..")
}

/** True if SES env is present. */
function hasSesConfig(): boolean {
  return !!(
    env.PRIVATE_AWS_ACCESS_KEY_ID &&
    env.PRIVATE_AWS_SECRET_ACCESS_KEY &&
    env.PRIVATE_AWS_REGION
  )
}

/** Build the SES client once, reuse thereafter. */
let _sesClient: SESv2Client | null = null
function getSesClient(): SESv2Client {
  if (_sesClient) return _sesClient
  _sesClient = new SESv2Client({
    region: env.PRIVATE_AWS_REGION!,
    credentials: {
      accessKeyId: env.PRIVATE_AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.PRIVATE_AWS_SECRET_ACCESS_KEY!,
    },
  })
  return _sesClient
}

/** Compile a Handlebars template file (if present); return rendered or undefined. */
async function tryRenderTemplate(
  templateBaseName: string,
  kind: "text" | "html",
  props: Record<string, unknown>,
): Promise<string | undefined> {
  try {
    const mod = await import(`./emails/${templateBaseName}_${kind}.hbs?raw`)
    const src: string = mod.default
    const compiled = handlebars.compile(src)
    return compiled(props)
  } catch {
    return undefined
  }
}

/** Normalize and de-duplicate email addresses; drop falsy entries. */
function cleanEmailList(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const v = (raw ?? "").trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

// ---------- Public API (unchanged signatures/throws) ----------

export const sendAdminEmail = async ({
  subject,
  body,
  toEmail,
}: {
  subject: string
  body: string
  toEmail?: string
}): Promise<void> => {
  const recipient = toEmail || env.PRIVATE_ADMIN_EMAIL
  if (!recipient) {
    return
  }
  if (!hasSesConfig()) {
    console.warn(
      "Admin email not sent. AWS SES environment variables are not set.",
    )
    return
  }

  try {
    const ses = getSesClient()
    const command = new SendEmailCommand({
      FromEmailAddress: env.PRIVATE_FROM_ADMIN_EMAIL || recipient,
      ConfigurationSetName: env.PRIVATE_SES_CONFIGURATION_SET,
      Destination: { ToAddresses: [recipient] },
      Content: {
        Simple: {
          Subject: {
            Data: "ADMIN_MAIL: " + sanitizeSubject(subject),
            Charset: "UTF-8",
          },
          Body: { Text: { Data: body, Charset: "UTF-8" } },
        },
      },
    })
    await ses.send(command)
  } catch (e: unknown) {
    console.error("Failed to send admin email via SES, error:", e)
  }
}

export const sendUserEmail = async ({
  user,
  subject,
  from_email,
  template_name,
  template_properties,
}: {
  user: { id: string; email?: string | null }
  subject: string
  from_email: string
  template_name: string
  template_properties: Record<string, unknown>
}): Promise<void> => {
  const email = user.email
  if (!email) {
    console.error(
      "Email Error: Attempted to send email to user with no email address.",
      { userId: user.id },
    )
    throw new Error("User has no email address.")
  }

  const { data: serviceUserData, error: getUserErr } =
    await supabaseAdmin.auth.admin.getUserById(user.id)

  if (getUserErr) {
    console.warn("Email Aborted: getUserById failed; treating as unverified.", {
      userId: user.id,
      email,
      error: getUserErr?.message ?? String(getUserErr),
    })
    return
  }

  const emailVerified =
    serviceUserData?.user?.email_confirmed_at ||
    (
      serviceUserData?.user?.user_metadata as
        | Record<string, unknown>
        | undefined
    )?.["email_verified"]

  if (!emailVerified) {
    console.warn(
      "Email Aborted: Attempted to send email to unverified address.",
      {
        userId: user.id,
        email,
      },
    )
    return
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("unsubscribed")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error(
      "Email Error: Could not fetch user profile to check subscription status.",
      { userId: user.id, email, error: profileError },
    )
    throw new Error("Failed to fetch user profile.")
  }

  if (profile?.unsubscribed) {
    console.log("Email Aborted: User is unsubscribed.", {
      userId: user.id,
      email,
    })
    return
  }

  await sendTemplatedEmail({
    subject,
    to_emails: [email],
    from_email,
    template_name,
    template_properties,
    preheader: `Your ${WebsiteName} account is active. Time to deploy your arsenal.`,
  })
}

export const sendUserPlainEmail = async ({
  user,
  subject,
  body,
  from_email,
  respectUnsubscribe = true,
}: {
  user: { id: string; email?: string | null }
  subject: string
  body: string
  from_email: string
  /** When false, allow admin-style overrides to email unsubscribed users. */
  respectUnsubscribe?: boolean
}): Promise<void> => {
  const email = user.email
  if (!email) {
    console.error(
      "Email Error: Attempted to send email to user with no email address.",
      { userId: user.id },
    )
    throw new Error("User has no email address.")
  }

  // Check service user & email verification (same logic used in sendUserEmail)
  const { data: serviceUserData, error: getUserErr } =
    await supabaseAdmin.auth.admin.getUserById(user.id)

  if (getUserErr) {
    console.warn("[mailer.sendUserPlainEmail] SOFT_ABORT:getUserById_failed", {
      userId: user.id,
      email,
      error: getUserErr?.message ?? String(getUserErr),
    })
    return
  }

  const emailVerified =
    serviceUserData?.user?.email_confirmed_at ||
    (
      serviceUserData?.user?.user_metadata as
        | Record<string, unknown>
        | undefined
    )?.["email_verified"]

  if (!emailVerified) {
    console.warn("[mailer.sendUserPlainEmail] SOFT_ABORT:email_not_verified", {
      userId: user.id,
      email,
    })
    return
  }

  // Unsubscribe guard (same check used by sendUserEmail)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("unsubscribed")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error(
      "Email Error: Could not fetch user profile to check subscription status.",
      { userId: user.id, email, error: profileError },
    )
    // Behavior unchanged: still throw a generic error
    throw new Error("Failed to fetch user profile.")
  }

  if (profile?.unsubscribed) {
    if (respectUnsubscribe) {
      console.log(
        "[mailer.sendUserPlainEmail] SOFT_ABORT:unsubscribed_respected",
        {
          userId: user.id,
          email,
        },
      )
      return
    } else {
      console.warn(
        "[mailer.sendUserPlainEmail] OVERRIDE:unsubscribed_but_override_enabled",
        { userId: user.id, email },
      )
      // fall through and send anyway
    }
  }

  // SES config present?
  if (
    !(
      env.PRIVATE_AWS_ACCESS_KEY_ID &&
      env.PRIVATE_AWS_SECRET_ACCESS_KEY &&
      env.PRIVATE_AWS_REGION
    )
  ) {
    console.warn("[mailer.sendUserPlainEmail] SOFT_ABORT:ses_not_configured", {
      userId: user.id,
      email,
    })
    return
  }

  // Send via SES "Simple" text body (same style as sendAdminEmail)
  const ses = new SESv2Client({
    region: env.PRIVATE_AWS_REGION!,
    credentials: {
      accessKeyId: env.PRIVATE_AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.PRIVATE_AWS_SECRET_ACCESS_KEY!,
    },
  })

  const sanitizedSubject = (subject || "").replace(/[\r\n]+/g, " ").trim()

  const command = new SendEmailCommand({
    FromEmailAddress: from_email,
    ConfigurationSetName: env.PRIVATE_SES_CONFIGURATION_SET,
    Destination: { ToAddresses: [email] },
    Content: {
      Simple: {
        Subject: {
          Data: sanitizedSubject,
          Charset: "UTF-8",
        },
        Body: { Text: { Data: body || "", Charset: "UTF-8" } },
      },
    },
  })

  console.info("[mailer.sendUserPlainEmail] CALLING_SES", {
    userId: user.id,
    to: email,
    from: from_email,
    subject: sanitizedSubject,
  })

  try {
    const resp = await ses.send(command)
    console.log("[mailer.sendUserPlainEmail] SES send ok", {
      userId: user.id,
      to: email,
      from: from_email,
      messageId: (resp as any)?.MessageId ?? null,
    })
  } catch (e: unknown) {
    const raw =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : JSON.stringify(e)
    const msg = String(raw)

    const rcpt = (email || "").toLowerCase()
    const from = (from_email || "").toLowerCase()

    // Try to detect SES “identity not verified” style messages
    const m = /identities?\s+failed.*?:\s*([^,\s]+)/i.exec(msg)
    const failedIdentity = (m?.[1] ?? "").toLowerCase()

    if (/not verified/i.test(msg) && failedIdentity) {
      const ctx = { userId: user.id, to: rcpt, from, msg }

      if (failedIdentity === rcpt) {
        console.warn(
          "[mailer.sendUserPlainEmail] SES_FAIL:RECIPIENT_NOT_VERIFIED",
          ctx,
        )
        // NOTE: error string unchanged (used by admin error mapping)
        throw new Error("SES:SEND_FAIL:RECIPIENT_NOT_VERIFIED")
      }
      if (failedIdentity === from) {
        console.warn(
          "[mailer.sendUserPlainEmail] SES_FAIL:SENDER_NOT_VERIFIED",
          ctx,
        )
        throw new Error("SES:SEND_FAIL:SENDER_NOT_VERIFIED")
      }

      console.warn(
        "[mailer.sendUserPlainEmail] SES_FAIL:IDENTITY_NOT_VERIFIED",
        ctx,
      )
      throw new Error("SES:SEND_FAIL:IDENTITY_NOT_VERIFIED")
    }

    if (/MessageRejected/i.test(msg)) {
      console.warn("[mailer.sendUserPlainEmail] SES_FAIL:MESSAGE_REJECTED", {
        userId: user.id,
        to: rcpt,
        from,
        msg,
      })
      throw new Error("SES:SEND_FAIL:MESSAGE_REJECTED")
    }

    // Catch-all: unexpected SES failure for this recipient
    console.error("[mailer.sendUserPlainEmail] SES_FAIL:UNEXPECTED", {
      userId: user.id,
      to: rcpt,
      from,
      error: msg,
    })
    throw new Error(`SES API Error: ${msg}`)
  }
}

export const sendTemplatedEmail = async ({
  subject,
  to_emails,
  from_email,
  template_name,
  template_properties,
  preheader,
}: {
  subject: string
  to_emails: string[]
  from_email: string
  template_name: string
  template_properties: Record<string, unknown>
  preheader?: string
}): Promise<void> => {
  if (!hasSesConfig()) {
    console.warn(
      "Email not configured. AWS SES environment variables are not set. Skipping email send.",
    )
    return
  }

  const safeTemplateName = isSafeTemplateName(template_name)
    ? template_name
    : ""

  const fullProps = {
    subject,
    preheader: preheader || subject,
    companyName: WebsiteName,
    tagline: WebsiteDescription,
    theme: saasstartertheme,
    ...template_properties,
  }

  const [plaintextBody, htmlBody] = await Promise.all([
    safeTemplateName
      ? tryRenderTemplate(safeTemplateName, "text", fullProps)
      : Promise.resolve(undefined),
    safeTemplateName
      ? tryRenderTemplate(safeTemplateName, "html", fullProps)
      : Promise.resolve(undefined),
  ])

  if (!plaintextBody && !htmlBody) {
    console.error(
      "Email Error: No email body templates found. Requires plaintext or html. Template name:",
      template_name,
    )
    throw new Error(`No email templates found for ${template_name}`)
  }

  const recipients = cleanEmailList(to_emails)
  if (recipients.length === 0) {
    console.warn("Email Aborted: Empty recipient list after cleaning.")
    return
  }

  try {
    const ses = getSesClient()
    const command = new SendEmailCommand({
      FromEmailAddress: from_email,
      ConfigurationSetName: env.PRIVATE_SES_CONFIGURATION_SET,
      Destination: {
        ToAddresses: recipients,
      },
      Content: {
        Simple: {
          Subject: {
            Data: sanitizeSubject(subject),
            Charset: "UTF-8",
          },
          Body: {
            ...(plaintextBody && {
              Text: { Data: plaintextBody, Charset: "UTF-8" },
            }),
            ...(htmlBody && { Html: { Data: htmlBody, Charset: "UTF-8" } }),
          },
        },
      },
    })

    const response = await ses.send(command)
    console.log(
      `Email sent successfully via SES. Message ID: ${response.MessageId}`,
    )
  } catch (e: unknown) {
    console.error("Email Error: Failed to send email via SES.", { error: e })
    const errorMessage =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : JSON.stringify(e)
    throw new Error(`SES API Error: ${errorMessage}`)
  }
}
