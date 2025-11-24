// src/routes/(marketing)/+page.server.ts
import type { PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"
import { getDisplayProductsWithOverrides } from "$lib/server/product_overrides"

/**
 * Server load for the marketing landing page.
 * - Keeps the returned shape EXACTLY as `{ products }`
 * - Adds typed safety and runtime guards
 * - Marks a dependency key for fine-grained invalidation
 * - Sends conservative cache headers to improve performance without risking staleness
 */

export const load = (async ({ setHeaders, depends }) => {
  // Allow other parts of the app to invalidate this easily (e.g., after admin changes)
  depends("app:products")

  try {
    const products = await getDisplayProductsWithOverrides()

    // Runtime guard to ensure we always return a serializable array
    if (!Array.isArray(products)) {
      throw new TypeError(
        "getDisplayProductsWithOverrides() did not return an array",
      )
    }

    // Ensure JSON-serializable clone (guards against accidental non-cloneable values)
    let safeProducts = products as unknown[]
    try {
      // Node 18+ built-in deep clone
      safeProducts = structuredClone(products)
    } catch {
      // Fallback for environments lacking structuredClone
      safeProducts = JSON.parse(JSON.stringify(products))
    }

    // Short, friendly cache with stale-while-revalidate
    // Keeps response snappy while allowing background revalidation
    setHeaders({
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    })

    // ⬇️ Do not change this shape
    return { products: safeProducts }
  } catch (e) {
    console.error("[marketing/+page.server] Failed to load products:", e)
    // Preserve failure semantics while providing a clean 500
    throw error(500, "Failed to load products")
  }
}) satisfies PageServerLoad
