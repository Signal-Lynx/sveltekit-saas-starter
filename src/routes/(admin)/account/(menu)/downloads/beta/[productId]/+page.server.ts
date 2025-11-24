import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import { getBetaProductById } from "$lib/data/beta_products"
import { listFiles } from "$lib/server/r2"
import { SECURE_DOWNLOADS_BASE } from "../../../../../../../config"

export const load: PageServerLoad = async ({ params, parent }) => {
  const { profile } = await parent()
  const { productId } = params

  if (!profile?.is_beta_tester) {
    throw error(403, "Access Denied: Beta area is for authorized testers only.")
  }

  const product = getBetaProductById(productId)
  if (!product) {
    throw error(404, "Beta product not found")
  }

  const prefix = `beta/downloads/${productId}/`
  const files = await listFiles(prefix, SECURE_DOWNLOADS_BASE)

  return {
    product,
    files,
  }
}
