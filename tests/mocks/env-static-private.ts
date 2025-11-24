// tests/mocks/env-static-private.ts
// Only export the names your code imports from $env/static/private.
// Values come from real process.env in CI/local.

export const PRIVATE_STRIPE_API_KEY = process.env.PRIVATE_STRIPE_API_KEY ?? ""
export const PRIVATE_STRIPE_WEBHOOK_SECRET =
  process.env.PRIVATE_STRIPE_WEBHOOK_SECRET ?? ""
export const PRIVATE_SUPABASE_SERVICE_ROLE =
  process.env.PRIVATE_SUPABASE_SERVICE_ROLE ?? ""
export const PRIVATE_SITE_ACCESS_PASSWORD =
  process.env.PRIVATE_SITE_ACCESS_PASSWORD ?? ""

// --- Added to satisfy src/lib/server/env.ts validation ---
export const PRIVATE_LICENSE_MANAGER_URL =
  process.env.PRIVATE_LICENSE_MANAGER_URL ?? ""
export const PRIVATE_LICENSE_MANAGER_API_KEY =
  process.env.PRIVATE_LICENSE_MANAGER_API_KEY ?? ""

// --- Email & AWS config ---
export const PRIVATE_SES_CONFIGURATION_SET =
  process.env.PRIVATE_SES_CONFIGURATION_SET ?? ""
export const PRIVATE_ADMIN_EMAIL = process.env.PRIVATE_ADMIN_EMAIL ?? ""
export const PRIVATE_FROM_ADMIN_EMAIL =
  process.env.PRIVATE_FROM_ADMIN_EMAIL ?? ""
export const PRIVATE_AWS_REGION = process.env.PRIVATE_AWS_REGION ?? ""
export const PRIVATE_AWS_ACCESS_KEY_ID =
  process.env.PRIVATE_AWS_ACCESS_KEY_ID ?? ""
export const PRIVATE_AWS_SECRET_ACCESS_KEY =
  process.env.PRIVATE_AWS_SECRET_ACCESS_KEY ?? ""
