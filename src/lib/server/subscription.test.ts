import { describe, it, expect } from "vitest"
import { entitlementsToActiveProducts } from "./subscription"
import type { LMEntitlement } from "../types"

describe("entitlementsToActiveProducts", () => {
  it("collapses duplicates and prefers strongest status", () => {
    // Uses "hoverboard" (Template product) instead of "script" (Prod product)
    const ents: LMEntitlement[] = [
      {
        status: "trial",
        product_identifier: "hoverboard",
        tier_identifier: null,
      } as any,
      {
        status: "developer",
        product_identifier: "hoverboard",
        tier_identifier: null,
      } as any,
      {
        status: "active",
        product_identifier: "timeline_c",
        tier_identifier: null,
      } as any,
    ]
    const rows = entitlementsToActiveProducts(ents)
    expect(rows.length).toBe(2)
    const hover = rows.find((r) => r.id === "hoverboard")
    expect(hover?.status).toBe("developer")
    const timeline = rows.find((r) => r.id === "timeline_c")
    expect(timeline?.status).toBe("active")
  })
})
