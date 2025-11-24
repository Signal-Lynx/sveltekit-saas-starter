// src/lib/data/beta_products.ts

/**
 * Beta product metadata used to gate access, set cookies, and drive checkout.
 * NOTE: This module is platform-agnostic (no server-only imports). It can be
 * safely imported from both server and client code.
 */

export interface BetaProduct {
  /** Stable identifier used internally and in URLs/cookies */
  readonly id: string
  /** Human-friendly name shown in the UI */
  readonly name: string
  /** Short marketing description */
  readonly description: string
  /** Name of the PRIVATE env var that stores the beta passphrase */
  readonly envVariable: string
  /** Cookie key used to store access grant for this beta */
  readonly cookieName: string
  /** Stripe Checkout URL for this beta (can be empty if not yet available) */
  readonly stripeCheckoutUrl: string
  /**
   * IMPORTANT: Must match the "Product Identifier" in the License Manager (LM)
   * so that entitlements line up correctly.
   */
  readonly licenseManagerProductId: string
}

/* -------------------------------------------------------------------------- */
/*                               Canonical data                                */
/* -------------------------------------------------------------------------- */

/**
 * Keep the literal tuple private so we can:
 *  - maintain exact literal unions for `BetaProductId`
 *  - export a widened, readonly `betaProducts` array that matches prior API
 */
const _betaProducts = [
  {
    id: "Hoverboard_Beta",
    name: "Hoverboard Mk.II (Beta)",
    description:
      "Experimental anti-gravity firmware. Warning: May cause local time dilation.",
    envVariable: "PRIVATE_BETA_PASSPHRASE_Hoverboard_Beta",
    cookieName: "beta_access_Hoverboard_Beta",
    stripeCheckoutUrl: "", // <-- SET TO EMPTY STRING
    licenseManagerProductId: "Hoverboard Beta",
  },
  {
    id: "TimelineC_Beta",
    name: "Timeline C (Beta Build)",
    description:
      "Early access to the next stable reality patch. Use at your own risk.",
    envVariable: "PRIVATE_BETA_PASSPHRASE_TimelineC_Beta",
    cookieName: "beta_access_TimelineC_Beta",
    stripeCheckoutUrl: "", // <-- SET TO EMPTY STRING
    licenseManagerProductId: "Timeline C Beta",
  },
] as const

/**
 * Public export preserving the original name and type shape.
 * Immutable at runtime; typed as readonly array of BetaProduct.
 */
export const betaProducts: readonly BetaProduct[] = _betaProducts

/* -------------------------------------------------------------------------- */
/*                            Convenience type aliases                         */
/* -------------------------------------------------------------------------- */

/** Union of valid beta product IDs (derived from the data above) */
export type BetaProductId = (typeof _betaProducts)[number]["id"]

/** Union of LM product identifiers (useful for cross-system lookups) */
export type LicenseManagerProductId =
  (typeof _betaProducts)[number]["licenseManagerProductId"]

/* -------------------------------------------------------------------------- */
/*                              Lookup conveniences                            */
/* -------------------------------------------------------------------------- */

/** Constant-time lookup maps (frozen) */
const _byId = Object.freeze(
  Object.fromEntries(_betaProducts.map((p) => [p.id, p] as const)),
) as Record<BetaProductId, Readonly<BetaProduct>>

const _byLmId = Object.freeze(
  Object.fromEntries(
    _betaProducts.map((p) => [p.licenseManagerProductId, p] as const),
  ),
) as Record<LicenseManagerProductId, Readonly<BetaProduct>>

/** Fast ID existence check with proper type narrowing */
export function isBetaProductId(id: string): id is BetaProductId {
  // Using hasOwnProperty to avoid prototype surprises
  return Object.prototype.hasOwnProperty.call(_byId, id)
}

/** Get a beta product by its `id` (returns undefined if not found) */
export function getBetaProductById(
  id: string,
): Readonly<BetaProduct> | undefined {
  return (isBetaProductId(id) ? _byId[id] : undefined) as
    | Readonly<BetaProduct>
    | undefined
}

/** Get a beta product by its License Manager Product Identifier */
export function getBetaProductByLicenseId(
  lmProductId: string,
): Readonly<BetaProduct> | undefined {
  return _byLmId[lmProductId as LicenseManagerProductId]
}

/* -------------------------------------------------------------------------- */
/*                           Optional runtime validation                       */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight validator you can call from server code (optional).
 * Pass a function that returns env var values, e.g. `(k) => process.env[k]`.
 * Returns a list of human-readable warnings (empty array if all good).
 */
export function validateBetaProducts(
  getEnv?: (key: string) => string | undefined,
): string[] {
  const warnings: string[] = []

  // Duplicate id / LM id checks
  const seenIds = new Set<string>()
  const seenLmIds = new Set<string>()

  for (const p of _betaProducts) {
    if (seenIds.has(p.id)) warnings.push(`Duplicate id: ${p.id}`)
    seenIds.add(p.id)

    if (seenLmIds.has(p.licenseManagerProductId))
      warnings.push(
        `Duplicate licenseManagerProductId: ${p.licenseManagerProductId}`,
      )
    seenLmIds.add(p.licenseManagerProductId)

    if (!p.name.trim()) warnings.push(`Empty name for id ${p.id}`)
    if (!p.description.trim()) warnings.push(`Empty description for id ${p.id}`)
    if (!p.cookieName.trim()) warnings.push(`Empty cookieName for id ${p.id}`)
    if (!/^https?:\/\//i.test(p.stripeCheckoutUrl))
      warnings.push(`Suspicious Stripe URL for id ${p.id}`)

    if (getEnv) {
      const val = getEnv(p.envVariable)
      if (!val || !val.trim())
        warnings.push(
          `Env var ${p.envVariable} is missing/empty for id ${p.id}`,
        )
    }
  }

  return warnings
}
