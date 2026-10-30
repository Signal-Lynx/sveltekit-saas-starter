/**
 * Stripe REST API version used by the template's server-side Stripe clients.
 *
 * Keep this aligned with the installed Stripe SDK's supported API version.
 * The template's integrations are optional: declaring the version does not
 * initialize a Stripe client or require credentials during build/CI.
 */
export const STRIPE_API_VERSION = "2026-10-28.endive" as const
