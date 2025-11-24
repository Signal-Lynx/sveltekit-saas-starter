// src/lib/server/product_overrides.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
import { allProducts, type Product } from "$lib/data/products"

/** Row shape from public.product_overrides */
type OverrideRow = {
  id: string
  price_display: string | null
  hidden: boolean | null
  cta_label: string | null
  footnote: string | null
}

/** Merge a single DB override row onto a base product (no mutation). */
function applyOne(base: Product, o?: OverrideRow): Product {
  if (!o) return base
  return {
    ...base,
    // Only override when a value is present in the DB row
    price: o.price_display ?? base.price,
    hidden: o.hidden ?? base.hidden,
    ctaLabel: o.cta_label ?? base.ctaLabel,
    footnote: o.footnote ?? base.footnote,
  }
}

/** In-memory cache with TTL and in-flight dedupe to avoid thundering herd. */
let _cache: { at: number; products: Product[] } | null = null
let _inflight: Promise<Product[]> | null = null

// Keep the same effective refresh cadence as before
const TTL_MS = 30_000

/** Fetch overrides from Supabase and index them by product id. */
async function fetchOverridesMap(): Promise<Map<string, OverrideRow>> {
  try {
    // Only request overrides for known products; unknown rows are ignored anyway
    const ids = allProducts.map((p) => p.id)
    const { data, error } = await supabaseAdmin
      .from("product_overrides")
      .select("id, price_display, hidden, cta_label, footnote")
      .in("id", ids)

    if (error || !data) {
      console.warn(
        "[product_overrides] Using static products (query failed).",
        { hasError: Boolean(error) },
      )
      return new Map()
    }

    const rows = data as OverrideRow[]
    const map = new Map<string, OverrideRow>()
    for (const r of rows) {
      if (r && r.id) map.set(r.id, r)
    }
    return map
  } catch (_e) {
    // Extremely defensive: never throw on the read path—fallback to static list.
    console.warn("[product_overrides] Using static products (exception).")
    return new Map()
  }
}

/**
 * Read overrides (service-role via supabaseAdmin) and overlay onto allProducts.
 * Keeps the same order/shape as the static list.
 */
export async function getAllProductsWithOverrides(): Promise<Product[]> {
  const now = Date.now()
  if (_cache && now - _cache.at < TTL_MS) {
    return _cache.products
  }

  if (_inflight) {
    // Dedupe concurrent calls; re-use the same promise
    return _inflight
  }

  _inflight = (async () => {
    const byId = await fetchOverridesMap()
    const merged = allProducts.map((p) => applyOne(p, byId.get(p.id)))
    _cache = { at: Date.now(), products: merged }
    return merged
  })()

  try {
    return await _inflight
  } finally {
    // Ensure the next caller can start a fresh fetch after this completes
    _inflight = null
  }
}

/** Convenience: already filtered for display (respects .hidden like before). */
export async function getDisplayProductsWithOverrides(): Promise<Product[]> {
  const merged = await getAllProductsWithOverrides()
  return merged.filter((p) => !p.hidden)
}

/** Convenience: fetch a single product by id with overrides applied. */
export async function getProductWithOverrides(
  id: string,
): Promise<Product | undefined> {
  const merged = await getAllProductsWithOverrides()
  return merged.find((p) => p.id === id)
}

/**
 * Test-only utility: clear the in-memory cache.
 * Safe to keep exported; a no-op in production flows unless invoked.
 */
export function __resetProductOverridesCache(): void {
  _cache = null
  _inflight = null
}
