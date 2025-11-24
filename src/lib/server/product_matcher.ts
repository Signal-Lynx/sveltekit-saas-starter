// src/lib/server/product_matcher.ts
import { allProducts } from "$lib/data/products"
import type { Product } from "$lib/data/products"

const normalize = (s?: string | null): string => (s ?? "").trim().toLowerCase()

// Build a lookup index once (lazy). We now index internal ids too.
let index: Map<string, Product> | null = null

function buildIndex(): Map<string, Product> {
  const map = new Map<string, Product>()

  const add = (
    key: string | undefined,
    product: Product,
    field: "id" | "stripe_product_id" | "stripe_price_id",
  ) => {
    const k = normalize(key)
    if (!k) return

    const existing = map.get(k)
    if (existing && existing !== product) {
      try {
        console.warn(
          `[product_matcher] Duplicate ${field} "${k}" for products "${existing.id}" and "${product.id}". Using the first occurrence.`,
        )
      } catch {
        // no-op
      }
      return
    }
    map.set(k, product)
  }

  for (const p of allProducts) {
    // NEW: index by internal product id (e.g., "engine", "license-hub", "script")
    add(p.id, p, "id")
    // Keep Stripe IDs too
    add(
      (p as any).stripe_product_id as string | undefined,
      p,
      "stripe_product_id",
    )
    add((p as any).stripe_price_id as string | undefined, p, "stripe_price_id")
  }

  return map
}

function getIndex(): Map<string, Product> {
  if (!index) index = buildIndex()
  return index
}

/**
 * Maps a product identifier to our internal Product definition.
 * Accepts:
 *   - Internal ids: "engine", "license-hub", "script"
 *   - Stripe product ids: "prod_..."
 *   - Stripe price ids:   "price_..."
 */
export function mapIdentifierToProduct(
  identifier: string,
): Product | undefined {
  const needle = normalize(identifier)
  if (!needle) return undefined
  return getIndex().get(needle)
}
