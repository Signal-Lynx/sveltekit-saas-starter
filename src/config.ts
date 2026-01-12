// FILE: src/config.ts

import { env } from "$env/dynamic/public"
import { dev } from "$app/environment"

// --- Brand & Contact env overrides (with safe defaults) ---
export const CompanyLegalName = fromEnv(
  "PUBLIC_COMPANY_LEGAL_NAME",
  "Paradox Innovations LLC",
)
export const CompanyPhone = fromEnv("PUBLIC_COMPANY_PHONE", "555-0199")

export const ContactEmail = fromEnv(
  "PUBLIC_CONTACT_EMAIL",
  "lab-results@example.com",
)
export const SupportEmail = fromEnv(
  "PUBLIC_SUPPORT_EMAIL",
  "containment-breach@example.com",
)
export const SecurityEmail = fromEnv(
  "PUBLIC_SECURITY_EMAIL",
  "security@example.com",
)
export const PrivacyEmail = fromEnv(
  "PUBLIC_PRIVACY_EMAIL",
  "privacy@example.com",
)
export const LegalEmail = fromEnv("PUBLIC_LEGAL_EMAIL", "legal@example.com")
export const MachineResetEmail = fromEnv(
  "PUBLIC_MACHINE_RESET_EMAIL",
  "timeline-reset@example.com",
)

export const SocialTelegram = fromEnv(
  "PUBLIC_SOCIAL_TELEGRAM",
  "https://t.me/SignalLynx",
)
// Updated to your real X account
export const SocialTwitter = fromEnv(
  "PUBLIC_SOCIAL_TWITTER",
  "https://x.com/SignalLynx",
)

/**
 * Parse a boolean-like env value safely.
 * Accepts: "true"/"false", "1"/"0", "yes"/"no", "on"/"off" (case/space-insensitive).
 * Falls back to the provided default when missing or unrecognized.
 */
function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value !== "string") return fallback
  const v = value.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "y" || v === "on"
}

/** Read a public env var with a string fallback. */
function fromEnv(key: string, fallback: string): string {
  const v = (env as Record<string, string | undefined>)[key]
  return typeof v === "string" && v.length > 0 ? v : fallback
}

/** In dev, warn (don’t throw) when WebsiteBaseUrl looks malformed. */
function validateBaseUrl(urlStr: string): void {
  if (!dev) return
  try {
    // Will throw on invalid URL
    new URL(urlStr)
  } catch {
    console.warn(
      `[config] WebsiteBaseUrl is not a valid absolute URL: "${urlStr}". ` +
        `Set PUBLIC_WEBSITE_BASE_URL to a fully-qualified URL (e.g., "https://example.com").`,
    )
  }
}

/* --------------------------------------------------------------------------------
 * Public configuration (defaults preserved; optional PUBLIC_* env overrides)
 * -------------------------------------------------------------------------------- */

export const WebsiteName: string = fromEnv(
  "PUBLIC_WEBSITE_NAME",
  "Paradox Innovations",
)

// Trim trailing slashes from base URL to avoid accidental double-slashes when composing URLs downstream.
export const WebsiteBaseUrl: string = fromEnv(
  "PUBLIC_WEBSITE_BASE_URL",
  "http://localhost:5173",
).replace(/\/+$/, "")

validateBaseUrl(WebsiteBaseUrl)

export const WebsiteDescription: string = fromEnv(
  "PUBLIC_WEBSITE_DESCRIPTION",
  "Solving tomorrow's problems by causing them today. Secure automation templates for the timeline-conscious.",
)

/**
 * Feature flag controlled by .env (PUBLIC_CREATE_PROFILE_STEP).
 * Accepts common truthy values in addition to "true" for improved DX.
 * Defaults to false to preserve existing behavior when unset.
 */
export const CreateProfileStep: boolean = parseBool(
  (env as Record<string, string | undefined>).PUBLIC_CREATE_PROFILE_STEP,
  false,
)

/* --------------------------------------------------------------------------------
 * Downloads config (single source of truth)
 * -------------------------------------------------------------------------------- */

// The custom domain for your PUBLIC assets (e.g., READMEs)
export const PUBLIC_ASSETS_BASE: string = fromEnv(
  "PUBLIC_ASSETS_BASE",
  "https://assets.example.com",
)

// The path (or absolute base) for the secure downloads API gate
export const SECURE_DOWNLOADS_BASE: string = fromEnv(
  "PUBLIC_SECURE_DOWNLOADS_BASE",
  "/api/download",
)

/**
 * R2 folder prefixes for READMEs. The app will list files in these directories.
 * NOTE: These are the top-level folders. The server will list all files inside.
 */
export const README_PREFIXES = Object.freeze({
  hoverboard: "hoverboard/",
  timeline_c: "timeline_c/",
} as const)

/**
 * R2 folder prefixes for secure software downloads.
 * NOTE: It is recommended to include a version folder, e.g., "signal-shield/v1.0/"
 */
export const DOWNLOAD_PREFIXES = Object.freeze({
  // Product A (Hoverboard)
  hoverboard: "hoverboard/",

  // Product B (Timeline C)
  timeline_c: "timeline_c/",
} as const)

/** Site-wide constants for branding and navigation */
export const SITE_CONFIG = Object.freeze({
  // Site Information
  logoPath: "/images/logo.png", // Placeholder for template users
  logoAlt: `${WebsiteName} Logo`,
  companyLegalName: CompanyLegalName,

  // Legal/Address
  companyPhone: CompanyPhone,
  companyAddress: [
    `Registered Agent for ${CompanyLegalName}`,
    fromEnv("PUBLIC_COMPANY_ADDRESS_LINE2", "Sector 7G"),
    fromEnv("PUBLIC_COMPANY_ADDRESS_LINE3", "Black Mesa, NM 87544"),
  ],

  // Contact Information
  contactEmail: ContactEmail,
  supportEmail: SupportEmail,
  securityEmail: SecurityEmail,
  privacyEmail: PrivacyEmail,
  legalEmail: LegalEmail,
  machineResetEmail: MachineResetEmail,

  // Social Media Links
  socials: [
    {
      name: "GitHub",
      href: "https://github.com/Signal-Lynx/sveltekit-saas-starter", // FIXED
    },
    { name: "X / Twitter", href: SocialTwitter }, // Points to SignalLynx
  ],

  // Footer Navigation Structure
  footerNav: {
    products: [
      { name: "Hover Tech", href: "/products/hover" },
      { name: "Timeline C", href: "/products/timeline" },
    ],
    company: [
      { name: "Docs", href: "/docs" },
      { name: "Articles", href: "/articles" },
      { name: "FAQ", href: "/faq" },
      { name: "Contact Us", href: "/contact_us" },
    ],
    legal: [
      { name: "Terms of Service", href: "/terms-of-service" },
      { name: "Privacy Policy", href: "/legal/privacy" },
      { name: "Billing & Refunds", href: "/legal/billing" },
      { name: "DMCA Policy", href: "/legal/dmca" },
      { name: "Accessibility", href: "/legal/accessibility" },
    ],
  },

  // NOTE FOR TEMPLATE USERS:
  // The following static files in the `/static` directory should be manually updated:
  // - /static/robots.txt
  // - /static/images/... (Replace logos and other brand assets)
} as const)

/** Narrow type helpers for stronger safety elsewhere (type-only exports; no runtime impact). */
export type DownloadId = keyof typeof DOWNLOAD_PREFIXES
export type ReadmeId = keyof typeof README_PREFIXES
