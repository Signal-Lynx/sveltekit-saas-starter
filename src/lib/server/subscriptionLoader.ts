import { error } from "@sveltejs/kit"
import { getUserSubscriptionState } from "$lib/server/subscription"
import type { ServerLoadEvent } from "@sveltejs/kit"

/**
 * A reusable loader to get the user's subscription state.
 * It depends on the parent layout for the user object and handles errors gracefully.
 */
export async function loadSubscriptionState(event: ServerLoadEvent) {
  const { parent, depends } = event
  const { user } = await parent()

  if (!user) {
    // This should be caught by parent layout guards, but check again for safety.
    throw error(401, "Unauthorized")
  }

  // Allow this data to be invalidated programmatically
  depends("subscription:state")

  try {
    const subscriptionState = await getUserSubscriptionState(user, {
      forceReload: true, // Always get fresh data on page load
    })
    return { subscriptionState }
  } catch (err) {
    console.error("[subscriptionLoader] Failed to get subscription state:", err)
    // Return a state that indicates an error, so the UI can handle it.
    return {
      subscriptionState: {
        isActiveCustomer: false,
        hasEverHadSubscription: false,
        entitlements: [],
        lmError: "Failed to connect to the license server.",
        // --- FIX 2: Add missing properties to match the success case ---
        planStatus: undefined,
        activeProducts: [],
        currentPlanId: undefined,
        currentPlan: undefined,
        ownedProductIds: [],
      },
    }
  }
}
