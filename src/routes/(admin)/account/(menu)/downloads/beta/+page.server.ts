// src/routes/(admin)/account/(menu)/downloads/beta/+page.server.ts (FINAL CORRECTED VERSION)
import { fail, error } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"
import { betaProducts } from "$lib/data/beta_products"
import type { BetaProduct as BetaProductDef } from "$lib/data/beta_products"
import { env } from "$env/dynamic/private"
import { loadSubscriptionState } from "$lib/server/subscriptionLoader"

// --- Types ---
type Status = "ineligible" | "locked" | "unlocked"
type ProductWithStatus = BetaProductDef & {
  status: Status
  hasProductionLicense: boolean
}
type ParentData = {
  profile?: { is_beta_tester?: boolean }
}

// Map Beta Product ID to its corresponding Production Product ID.
const BETA_TO_PROD_ID_MAP: Record<string, string> = {
  SignalShield_Beta: "script",
  LynxRelay_Beta: "engine",
  KeyCommander_Beta: "license-hub",
}

/**
 * Determines the status of a beta product for the current user.
 */
function computeStatus(
  product: BetaProductDef,
  productionEntitlements: Set<string>,
  getCookie: (name: string) => string | undefined,
): { status: Status; hasProductionLicense: boolean } {
  const hasCookie = getCookie(product.cookieName) === "true"
  const requiredProdId = BETA_TO_PROD_ID_MAP[product.id]
  const hasProductionLicense = productionEntitlements.has(requiredProdId)

  if (!hasProductionLicense) {
    return { status: "ineligible", hasProductionLicense: false }
  }

  if (hasCookie) {
    return { status: "unlocked", hasProductionLicense: true }
  }

  return { status: "locked", hasProductionLicense: true }
}

// --- Load ---
export const load: PageServerLoad = async (event) => {
  const { parent, cookies } = event
  const { profile } = (await parent()) as ParentData

  // Gate 1: User must be a designated beta tester.
  if (!profile?.is_beta_tester) {
    throw error(
      403,
      "Access Denied: This area is for authorized beta testers only.",
    )
  }

  // Use the central subscription loader to get the user's production entitlements.
  const { subscriptionState } = await loadSubscriptionState(event)
  const productionEntitlements = new Set(subscriptionState.ownedProductIds)

  const productsWithStatus: ProductWithStatus[] = betaProducts.map(
    (product) => {
      // Gate 2: Determine status based on production license and passphrase cookie.
      const { status, hasProductionLicense } = computeStatus(
        product,
        productionEntitlements,
        (n) => cookies.get(n),
      )
      return { ...product, status, hasProductionLicense }
    },
  )

  // Pass the full state to the client so it can make decisions.
  return { productsWithStatus, subscriptionState }
}

// --- Actions ---
export const actions: Actions = {
  redeem: async ({ request, cookies }) => {
    const formData = await request.formData()
    const passphrase = formData.get("passphrase")
    const productId = formData.get("productId")

    if (typeof passphrase !== "string" || typeof productId !== "string") {
      return fail(400, { error: "Missing passphrase or product ID." })
    }

    const product = betaProducts.find((p) => p.id === productId)
    if (!product) {
      return fail(404, { error: "Invalid beta product." })
    }

    const expectedPassphrase = env[product.envVariable] as string | undefined

    if (expectedPassphrase && passphrase === expectedPassphrase) {
      cookies.set(product.cookieName, "true", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30, // Cookie is valid for 30 days
      })
      return { success: true, productId }
    }

    return fail(401, { error: "Invalid passphrase.", productId })
  },
}
