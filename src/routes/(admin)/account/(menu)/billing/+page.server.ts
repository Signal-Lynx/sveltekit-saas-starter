// src/routes/(admin)/account/(menu)/billing/+page.server.ts
import type { PageServerLoad } from "./$types"
import { entitlementsToActiveProductsWithDates } from "$lib/server/subscription"
import { loadSubscriptionState } from "$lib/server/subscriptionLoader"

/**
 * Prewritten banner copy. Kept as readonly tuples for literal types,
 * and treated as immutable. These are selected server-side to avoid
 * hydration mismatches.
 */
const SLOW_COPY = [
  "Syncing your license status… this may take a few seconds.",
  "License server is responding slowly. We’re retrying in the background.",
  "Fetching entitlements… hold tight for a moment.",
  "We’re verifying your subscriptions—this is taking longer than usual.",
  "Your access is safe—this is only a display delay. We’re syncing now.",
] as const

const ERROR_COPY = [
  "We couldn’t reach the license server. Your access is safe—this is only a display delay.",
] as const

/**
 * Pick a random item from a non-empty readonly tuple.
 * Intentionally minimal and side-effect free.
 */
function pick<T extends readonly unknown[]>(arr: T): T[number] {
  // Arrays are non-empty by construction above, but guard anyway
  const len = arr.length
  const idx = len > 1 ? Math.floor(Math.random() * len) : 0
  return arr[idx]
}

/**
 * Safely derive active products. If upstream shape drifts or the helper
 * throws, we fail closed to an empty list instead of crashing the page.
 * This preserves output shape and avoids leaking internal errors to the UI.
 */
function safeActiveProducts(
  entitlements: unknown,
): ReturnType<typeof entitlementsToActiveProductsWithDates> {
  try {
    // Pass through whatever parent gave us; helper owns the contract.
    return entitlementsToActiveProductsWithDates(
      entitlements as Parameters<
        typeof entitlementsToActiveProductsWithDates
      >[0],
    )
  } catch {
    // Conservative fallback: empty list
    return [] as ReturnType<typeof entitlementsToActiveProductsWithDates>
  }
}

export const load: PageServerLoad = async (event) => {
  const { subscriptionState } = await loadSubscriptionState(event)

  const activeProducts = safeActiveProducts(subscriptionState.entitlements)

  return {
    // Pass through fields exactly as provided by parent() to avoid any semantic change.
    isActiveCustomer: subscriptionState.isActiveCustomer,
    hasEverHadSubscription: subscriptionState.hasEverHadSubscription,
    planStatus: subscriptionState.planStatus,
    activeProducts,
    lmError: subscriptionState.lmError ?? null,

    // Pre-selected server-side copy to keep SSR/hydration stable.
    bannerSlowCopy: pick(SLOW_COPY),
    bannerErrorCopy: pick(ERROR_COPY),
  }
}
