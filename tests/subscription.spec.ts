import { describe, it, expect } from "vitest"
import { entitlementsToActiveProducts } from "../src/lib/server/subscription"
import type { LMEntitlement } from "../src/lib/types"

describe("entitlementsToActiveProducts", () => {
  it("collapses duplicates and prefers strongest status", () => {
    const ents: LMEntitlement[] = [
      {
        status: "trial",
        product_identifier: "price_script",
        tier_identifier: null,
      } as any,
      {
        status: "developer",
        product_identifier: "price_script",
        tier_identifier: null,
      } as any,
      {
        status: "active",
        product_identifier: "price_engine",
        tier_identifier: null,
      } as any,
    ]
    const rows = entitlementsToActiveProducts(ents)
    // expect 2 unique products
    expect(rows.length).toBe(2)
    // script collapsed to developer
    const script = rows.find((r) => r.id === "script")
    expect(script?.status).toBe("developer")
    // engine is active
    const engine = rows.find((r) => r.id === "engine")
    expect(engine?.status).toBe("active")
  })
})
