// src/routes/(admin)/account/(menu)/+page.server.ts
import type { PageServerLoad } from "./$types"
import { entitlementsToActiveProducts } from "$lib/server/subscription"
import { loadSubscriptionState } from "$lib/server/subscriptionLoader"

export const load: PageServerLoad = async (event) => {
  const { subscriptionState } = await loadSubscriptionState(event)

  const entitlements = Array.isArray(subscriptionState?.entitlements)
    ? subscriptionState.entitlements
    : []

  let activeProducts: ReturnType<typeof entitlementsToActiveProducts>
  try {
    activeProducts = entitlementsToActiveProducts(entitlements)
  } catch (err) {
    console.error("entitlementsToActiveProducts failed:", err)
    activeProducts = []
  }

  return {
    isActiveCustomer: Boolean(subscriptionState?.isActiveCustomer),
    activeProducts,
    planStatus: subscriptionState?.planStatus,
    lmError: subscriptionState?.lmError ?? null,
  }
}
