// FILE: src/lib/server/env.ts
// - Same external API: `export const env = { PRIVATE_STRIPE_API_KEY, ... }`
// - Avoids named imports from $env/static/private so CI (no .env files) won't fail typegen.
// - Prefers static values when present; falls back to dynamic env in CI.
// - Preserves your Zod validation + masked dev warnings, prod fail-fast.
// - UPDATED: Adds License Manager vars, SES vars, and Admin Email vars.

import { dev } from "$app/environment"
import { z } from "zod"
import * as staticPriv from "$env/static/private" // namespace import avoids named export typing issues in CI
import { env as dynPriv } from "$env/dynamic/private"

// --- helpers ---------------------------------------------------------------

/** Mask a secret for safe logging: keep prefix (e.g., "sk_") + last 4 chars. */
function mask(secret: unknown): string {
  if (typeof secret !== "string" || secret.length === 0) return String(secret)
  const keepPrefix = secret.includes("_") ? secret.split("_")[0] + "_" : ""
  const tail = secret.slice(-4)
  return `${keepPrefix}***${tail}`
}

/** Preprocess empty strings to undefined for optional env vars. */
const emptyToUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema.optional(),
  )

/** Prefer static env (present when .env files exist) else dynamic (CI). */
function get(name: string): string | undefined {
  // The namespace import has no string index signature, so cast for lookup.
  const fromStatic = (
    staticPriv as unknown as Record<string, string | undefined>
  )[name]
  return fromStatic ?? (dynPriv[name] as string | undefined)
}

// --- schema ----------------------------------------------------------------

const EnvSchema = z.object({
  // Stripe secret keys are "sk_test_*" or "sk_live_*"
  PRIVATE_STRIPE_API_KEY: z.string().min(10).startsWith("sk_"),

  // Webhook secret may be intentionally unset in some environments
  PRIVATE_STRIPE_WEBHOOK_SECRET: emptyToUndefined(
    z.string().min(10).startsWith("whsec_"),
  ),

  // Supabase service role is required if used server-side
  PRIVATE_SUPABASE_SERVICE_ROLE: z.string().min(10),

  // Site access password is optional; empty -> undefined
  PRIVATE_SITE_ACCESS_PASSWORD: emptyToUndefined(z.string().min(1)),

  // --- AWS SES Settings ---
  PRIVATE_AWS_REGION: z.string().min(1).optional(),
  PRIVATE_AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  PRIVATE_AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  PRIVATE_SES_CONFIGURATION_SET: emptyToUndefined(z.string().min(1)),

  // --- Admin Email Settings ---
  PRIVATE_ADMIN_EMAIL: emptyToUndefined(z.string().email()),
  PRIVATE_FROM_ADMIN_EMAIL: emptyToUndefined(z.string().email()),

  // --- NEW: License Manager configuration ---
  PRIVATE_LICENSE_MANAGER_URL: z.string().url().min(1),
  PRIVATE_LICENSE_MANAGER_API_KEY: z.string().min(32),
})

// Capture raw values from either source (static first, dynamic fallback)
const RAW_ENV = {
  PRIVATE_STRIPE_API_KEY: get("PRIVATE_STRIPE_API_KEY"),
  PRIVATE_STRIPE_WEBHOOK_SECRET: get("PRIVATE_STRIPE_WEBHOOK_SECRET"),
  PRIVATE_SUPABASE_SERVICE_ROLE: get("PRIVATE_SUPABASE_SERVICE_ROLE"),
  PRIVATE_SITE_ACCESS_PASSWORD: get("PRIVATE_SITE_ACCESS_PASSWORD"),

  // --- AWS SES Settings ---
  PRIVATE_AWS_REGION: get("PRIVATE_AWS_REGION"),
  PRIVATE_AWS_ACCESS_KEY_ID: get("PRIVATE_AWS_ACCESS_KEY_ID"),
  PRIVATE_AWS_SECRET_ACCESS_KEY: get("PRIVATE_AWS_SECRET_ACCESS_KEY"),
  PRIVATE_SES_CONFIGURATION_SET: get("PRIVATE_SES_CONFIGURATION_SET"),

  // --- Admin Email Settings ---
  PRIVATE_ADMIN_EMAIL: get("PRIVATE_ADMIN_EMAIL"),
  PRIVATE_FROM_ADMIN_EMAIL: get("PRIVATE_FROM_ADMIN_EMAIL"),

  // --- NEW: License Manager configuration ---
  PRIVATE_LICENSE_MANAGER_URL: get("PRIVATE_LICENSE_MANAGER_URL"),
  PRIVATE_LICENSE_MANAGER_API_KEY: get("PRIVATE_LICENSE_MANAGER_API_KEY"),
} as const

// Validate with dev-friendly coercions for optional fields
const parsed = EnvSchema.safeParse({
  PRIVATE_STRIPE_API_KEY: RAW_ENV.PRIVATE_STRIPE_API_KEY,
  PRIVATE_STRIPE_WEBHOOK_SECRET: RAW_ENV.PRIVATE_STRIPE_WEBHOOK_SECRET,
  PRIVATE_SUPABASE_SERVICE_ROLE: RAW_ENV.PRIVATE_SUPABASE_SERVICE_ROLE,
  PRIVATE_SITE_ACCESS_PASSWORD: RAW_ENV.PRIVATE_SITE_ACCESS_PASSWORD,

  // AWS
  PRIVATE_AWS_REGION: RAW_ENV.PRIVATE_AWS_REGION,
  PRIVATE_AWS_ACCESS_KEY_ID: RAW_ENV.PRIVATE_AWS_ACCESS_KEY_ID,
  PRIVATE_AWS_SECRET_ACCESS_KEY: RAW_ENV.PRIVATE_AWS_SECRET_ACCESS_KEY,
  PRIVATE_SES_CONFIGURATION_SET: RAW_ENV.PRIVATE_SES_CONFIGURATION_SET,

  // Admin Email
  PRIVATE_ADMIN_EMAIL: RAW_ENV.PRIVATE_ADMIN_EMAIL,
  PRIVATE_FROM_ADMIN_EMAIL: RAW_ENV.PRIVATE_FROM_ADMIN_EMAIL,

  // NEW
  PRIVATE_LICENSE_MANAGER_URL: RAW_ENV.PRIVATE_LICENSE_MANAGER_URL,
  PRIVATE_LICENSE_MANAGER_API_KEY: RAW_ENV.PRIVATE_LICENSE_MANAGER_API_KEY,
})

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors

  if (dev) {
    // Dev: warn with masked values to avoid leaking secrets into logs
    const maskedSnapshot = {
      PRIVATE_STRIPE_API_KEY: mask(RAW_ENV.PRIVATE_STRIPE_API_KEY),
      PRIVATE_STRIPE_WEBHOOK_SECRET: mask(
        RAW_ENV.PRIVATE_STRIPE_WEBHOOK_SECRET,
      ),
      PRIVATE_SUPABASE_SERVICE_ROLE: mask(
        RAW_ENV.PRIVATE_SUPABASE_SERVICE_ROLE,
      ),
      PRIVATE_SITE_ACCESS_PASSWORD: mask(RAW_ENV.PRIVATE_SITE_ACCESS_PASSWORD),

      // AWS
      PRIVATE_AWS_REGION: mask(RAW_ENV.PRIVATE_AWS_REGION),
      PRIVATE_AWS_ACCESS_KEY_ID: mask(RAW_ENV.PRIVATE_AWS_ACCESS_KEY_ID),
      PRIVATE_AWS_SECRET_ACCESS_KEY: mask(
        RAW_ENV.PRIVATE_AWS_SECRET_ACCESS_KEY,
      ),
      PRIVATE_SES_CONFIGURATION_SET: mask(
        RAW_ENV.PRIVATE_SES_CONFIGURATION_SET,
      ),
      PRIVATE_ADMIN_EMAIL: mask(RAW_ENV.PRIVATE_ADMIN_EMAIL),
      PRIVATE_FROM_ADMIN_EMAIL: mask(RAW_ENV.PRIVATE_FROM_ADMIN_EMAIL),

      // NEW (include both original and alias masks for clarity)
      PRIVATE_LICENSE_MANAGER_URL: mask(RAW_ENV.PRIVATE_LICENSE_MANAGER_URL),
      PRIVATE_LICENSE_MANAGER_API_KEY: mask(
        RAW_ENV.PRIVATE_LICENSE_MANAGER_API_KEY,
      ),
      PRIVATE_LM_API_URL: mask(RAW_ENV.PRIVATE_LICENSE_MANAGER_URL),
      PRIVATE_WEBSITE_ERROR_API_KEY: mask(
        RAW_ENV.PRIVATE_LICENSE_MANAGER_API_KEY,
      ),
    }
    console.warn("[env] Invalid configuration (dev only warning):", details)
    console.warn("[env] Current (masked) values:", maskedSnapshot)
  } else {
    // Prod: fail fast with structured (non-secret) error
    throw new Error(
      `[env] Invalid environment configuration: ${JSON.stringify(details)}`,
    )
  }
}

// --- export (unchanged shape & values, plus NEW keys) ----------------------

export const env = {
  PRIVATE_STRIPE_API_KEY: RAW_ENV.PRIVATE_STRIPE_API_KEY!,
  PRIVATE_STRIPE_WEBHOOK_SECRET: RAW_ENV.PRIVATE_STRIPE_WEBHOOK_SECRET,
  PRIVATE_SUPABASE_SERVICE_ROLE: RAW_ENV.PRIVATE_SUPABASE_SERVICE_ROLE!,
  PRIVATE_SITE_ACCESS_PASSWORD: RAW_ENV.PRIVATE_SITE_ACCESS_PASSWORD,

  // AWS
  PRIVATE_AWS_REGION: RAW_ENV.PRIVATE_AWS_REGION,
  PRIVATE_AWS_ACCESS_KEY_ID: RAW_ENV.PRIVATE_AWS_ACCESS_KEY_ID,
  PRIVATE_AWS_SECRET_ACCESS_KEY: RAW_ENV.PRIVATE_AWS_SECRET_ACCESS_KEY,
  PRIVATE_SES_CONFIGURATION_SET: RAW_ENV.PRIVATE_SES_CONFIGURATION_SET,

  // Admin Email
  PRIVATE_ADMIN_EMAIL: RAW_ENV.PRIVATE_ADMIN_EMAIL,
  PRIVATE_FROM_ADMIN_EMAIL: RAW_ENV.PRIVATE_FROM_ADMIN_EMAIL,

  // Keep original names for back-compat:
  PRIVATE_LICENSE_MANAGER_URL: RAW_ENV.PRIVATE_LICENSE_MANAGER_URL!,
  PRIVATE_LICENSE_MANAGER_API_KEY: RAW_ENV.PRIVATE_LICENSE_MANAGER_API_KEY!,

  // Also export aliases requested in patch notes:
  PRIVATE_LM_API_URL: RAW_ENV.PRIVATE_LICENSE_MANAGER_URL!,
  PRIVATE_WEBSITE_ERROR_API_KEY: RAW_ENV.PRIVATE_LICENSE_MANAGER_API_KEY!,
}
