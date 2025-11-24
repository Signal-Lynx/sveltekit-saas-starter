// src/lib/types.ts

/**
 * The only valid statuses emitted by the License Manager.
 * Keep this list in sync with the LM server.
 */
export type EntitlementStatus =
  | "active"
  | "trial"
  | "developer"
  | "inactive"
  | "blocked"

/**
 * Readonly tuple of all statuses, useful for runtime checks or UI iteration.
 * Example: ENTITLEMENT_STATUSES.includes(status)
 */
export const ENTITLEMENT_STATUSES = [
  "active",
  "trial",
  "developer",
  "inactive",
  "blocked",
] as const satisfies ReadonlyArray<EntitlementStatus>

/** A convenience subset for "entitled enough to use things". */
export type EntitledStatus = Extract<
  EntitlementStatus,
  "active" | "trial" | "developer"
>

/**
 * Optional convenience: statuses that typically grant access.
 * (Provided for ergonomics; no behavior change unless you opt in.)
 */
export const ACTIVEISH_STATUSES = [
  "active",
  "trial",
  "developer",
] as const satisfies ReadonlyArray<EntitledStatus>

/** Utility: nullable helper used in a few places below. */
export type Nullable<T> = T | null

/** Alias used to annotate ISO8601 date-time strings for clarity. */
export type ISODateString = string

// ---------------------------------------------------------------------------
// LMEntitlement
// ---------------------------------------------------------------------------

/**
 * The complete, shared definition for a license entitlement object.
 * This exactly matches the License Manager data shape.
 */
export interface LMEntitlement {
  /** The full license key string. */
  license_key: string

  /** Current entitlement status as defined by the LM. */
  status: EntitlementStatus

  /** Identifier of the product this license belongs to (from LM), or null. */
  product_identifier: Nullable<string>

  /** Optional tier identifier within the product, if present. */
  tier_identifier?: Nullable<string>

  /** Optional display-friendly product name from LM, if present. */
  product_display_name?: Nullable<string>

  /** Optional display-friendly tier name from LM, if present. */
  tier_display_name?: Nullable<string>

  /** Next renewal timestamp as ISO8601 (if subscription) or null. */
  renews_at: Nullable<ISODateString>

  /** Trial end timestamp as ISO8601, if applicable, else null. */
  trial_ends_at: Nullable<ISODateString>

  /** The number of seats/activations covered, if provided. */
  quantity?: Nullable<number>

  // --- OPTIONAL: cooldown telemetry from LM (if provided) ---

  /** When the last reset occurred (ISO8601), if tracked. */
  last_reset_at?: Nullable<ISODateString>

  /**
   * When the next reset is allowed (ISO8601), if the LM returns it.
   * Prefer this over the TTL if both are provided.
   */
  next_allowed_reset_at?: Nullable<ISODateString>

  /**
   * Fallback TTL (in seconds) until the next reset is allowed,
   * if the LM returns a numeric cooldown instead of a timestamp.
   */
  reset_cooldown_seconds?: Nullable<number>
}

// ---------------------------------------------------------------------------
// Tiny helpers (all optional to use) to increase robustness across the app.
// These do not change any existing shapes or contract; they only add utility.
// ---------------------------------------------------------------------------

/** Lightweight ISO8601-ish check (covers common LM forms, not a full RFC parser). */
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/

/** Runtime type guard for EntitlementStatus. */
export function isEntitlementStatus(v: unknown): v is EntitlementStatus {
  return (
    typeof v === "string" &&
    (ENTITLEMENT_STATUSES as readonly string[]).includes(v)
  )
}

/** Returns a stable rank useful for sorting statuses by strength. Higher = stronger. */
export function rankOfStatus(s: EntitlementStatus): number {
  // Keep in sync with any server-side logic you may have.
  const RANK: Record<EntitlementStatus, number> = {
    active: 3,
    developer: 2,
    trial: 1,
    inactive: 0,
    blocked: 0,
  }
  return RANK[s]
}

/** Convenience sorter: stronger statuses come first. */
export function compareEntitlementStatus(
  a: EntitlementStatus,
  b: EntitlementStatus,
): number {
  return rankOfStatus(b) - rankOfStatus(a)
}

/** Narrowing helper for nullable strings. */
function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === "string"
}

/** Narrowing helper for nullable ISO date strings (shallow heuristic). */
function isNullableISODateString(v: unknown): v is ISODateString | null {
  return v === null || (typeof v === "string" && ISO_DATE_RE.test(v))
}

/** Narrowing helper for nullable numbers. */
function isNullableNumber(v: unknown): v is number | null {
  return v === null || typeof v === "number"
}

/**
 * Best-effort runtime guard for LMEntitlement.
 * Validates required fields and lightly checks optional ones when present.
 */
export function isLMEntitlement(v: unknown): v is LMEntitlement {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>

  // Required
  if (typeof o.license_key !== "string") return false
  if (!isEntitlementStatus(o.status)) return false
  if (!isNullableString(o.product_identifier)) return false
  if (!isNullableISODateString(o.renews_at)) return false
  if (!isNullableISODateString(o.trial_ends_at)) return false

  // Optional (validate only if present)
  if ("tier_identifier" in o && !isNullableString(o.tier_identifier))
    return false
  if ("product_display_name" in o && !isNullableString(o.product_display_name))
    return false
  if ("tier_display_name" in o && !isNullableString(o.tier_display_name))
    return false
  if ("quantity" in o && !isNullableNumber(o.quantity)) return false

  if ("last_reset_at" in o && !isNullableISODateString(o.last_reset_at))
    return false
  if (
    "next_allowed_reset_at" in o &&
    !isNullableISODateString(o.next_allowed_reset_at)
  )
    return false
  if (
    "reset_cooldown_seconds" in o &&
    !isNullableNumber(o.reset_cooldown_seconds)
  )
    return false

  return true
}

/** Type helper: require certain LMEntitlement keys to be non-null when you know they are. */
export type WithRequiredKeys<T, K extends keyof T> = T & {
  [P in K]-?: NonNullable<T[P]>
}

/** Example: make renews_at non-nullable in a narrow scope. */
export type LMEntitlementWithRenewal = WithRequiredKeys<
  LMEntitlement,
  "renews_at"
>
