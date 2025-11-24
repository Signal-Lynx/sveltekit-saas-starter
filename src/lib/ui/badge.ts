// src/lib/ui/badge.ts
import type { EntitlementStatus } from "$lib/types"

/**
 * DaisyUI badge color class by entitlement status.
 * - Preserves existing outputs:
 *   active    -> "badge-success"
 *   developer -> "badge-info"
 *   trial     -> "badge-warning"
 *   others (inactive/blocked) -> "badge-ghost"
 *
 * The mapping uses `satisfies` to ensure compile-time coverage of all
 * EntitlementStatus variants, and includes a runtime fallback for extra safety.
 */
const STATUS_TO_BADGE = {
  active: "badge-success",
  developer: "badge-info",
  trial: "badge-warning",
  inactive: "badge-ghost",
  blocked: "badge-ghost",
} as const satisfies Record<EntitlementStatus, string>

/** Return just the color class (not including the "badge" base class). */
export function badgeClassForStatus(status: EntitlementStatus): string {
  // Runtime fallback guards against any unexpected value at call sites.
  return STATUS_TO_BADGE[status] ?? "badge-ghost"
}
