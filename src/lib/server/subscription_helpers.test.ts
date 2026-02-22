// src/lib/server/subscription_helpers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "@supabase/supabase-js"

// ---------- Stripe mock (no TDZ) ----------
vi.mock("stripe", () => {
  let instance: any

  const Stripe = vi.fn().mockImplementation(function () {
    instance = {
      customers: { create: vi.fn(), list: vi.fn() },
      subscriptions: { list: vi.fn() },
    }
    return instance
  })

  return {
    __esModule: true,
    default: Stripe,
    _getInstance: () => instance,
  }
})

// ---------- SvelteKit env mock ----------
vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_STRIPE_API_KEY: "sk_test_ci_dummy" },
}))

// ---------- Supabase admin mock (no TDZ) ----------
vi.mock("$lib/server/supabaseAdmin", () => {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    upsert: vi.fn(),
  }
  const from = vi.fn().mockImplementation((_table: string) => q)
  const supabaseAdmin = { from, __q: q } // expose query-builder for tests
  return { supabaseAdmin }
})

// ---------- Product catalog mock (Template IDs) ----------
vi.mock("$lib/data/products", () => ({
  allProducts: [
    { id: "hoverboard", stripe_product_id: "prod_hover_123" },
    { id: "timeline_c", stripe_product_id: "prod_timeline_123" },
  ],
}))

// Import AFTER mocks
import {
  getOrCreateCustomerId,
  fetchSubscription,
} from "$lib/server/subscription_helpers"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
const getStripe = async () => ((await import("stripe")) as any)._getInstance()

// ---------- Helpers ----------
function QB() {
  return (supabaseAdmin as any).__q as {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
}
function resetQB() {
  const q = QB()
  q.select.mockReset().mockReturnThis()
  q.eq.mockReset().mockReturnThis()
  q.single.mockReset()
  q.upsert.mockReset()
}

beforeEach(() => {
  vi.clearAllMocks()
  resetQB()
})

// ---------- Tests ----------
describe("Subscription Helpers", () => {
  describe("getOrCreateCustomerId", () => {
    const mockUser: Partial<User> = {
      id: "user_123",
      email: "user@example.com",
      user_metadata: { full_name: "Test User" } as any,
    }

    it("returns existing customer ID if found in DB", async () => {
      // first .single(): stripe_customers lookup
      QB().single.mockResolvedValueOnce({
        data: { stripe_customer_id: "cus_existing_123" },
        error: null,
      })

      const result = await getOrCreateCustomerId({ user: mockUser as User })
      expect(result.error).toBeUndefined()
      expect(result.customerId).toBe("cus_existing_123")

      const stripe = await getStripe()
      expect(stripe.customers.create).not.toHaveBeenCalled()
      expect(QB().upsert).not.toHaveBeenCalled()
    })

    it("creates a new Stripe customer and saves it if not found", async () => {
      // 1) no existing mapping (simulate PGRST116 no-rows)
      QB().single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      })
      // 2) profile lookup
      QB().single.mockResolvedValueOnce({
        data: { full_name: "Test User", website: "", company_name: "" },
        error: null,
      })

      const stripe = await getStripe()
      ;(stripe.customers.create as any).mockResolvedValue({ id: "cus_new_456" })
      QB().upsert.mockResolvedValue({ error: null })

      const result = await getOrCreateCustomerId({ user: mockUser as User })
      expect(result.error).toBeUndefined()
      expect(result.customerId).toBe("cus_new_456")
      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          name: "Test User",
          metadata: expect.objectContaining({ user_id: "user_123" }),
        }),
      )
      expect(QB().upsert).toHaveBeenCalled()
    })

    it("returns an error if user is null", async () => {
      const result = await getOrCreateCustomerId({ user: null as any })
      expect(result.error).toBeTruthy()
      expect(result.customerId).toBeUndefined()
    })

    it("surfaces an error if Stripe customer creation fails", async () => {
      // 1) no existing mapping
      QB().single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      })
      // 2) profile lookup
      QB().single.mockResolvedValueOnce({
        data: { full_name: "Test User", website: "", company_name: "" },
        error: null,
      })

      const stripe = await getStripe()
      ;(stripe.customers.create as any).mockRejectedValue(
        new Error("stripe boom"),
      )

      const result = await getOrCreateCustomerId({ user: mockUser as User })
      expect(result.customerId).toBeUndefined()
      expect(result.error).toBeTruthy()
    })
  })

  describe("fetchSubscription", () => {
    it("returns primary subscription if an active one is found", async () => {
      const stripe = await getStripe()
      ;(stripe.subscriptions.list as any).mockResolvedValue({
        data: [
          {
            id: "sub_1",
            status: "active",
            items: { data: [{ price: { product: "prod_hover_123" } }] },
          },
        ],
      })

      const result = await fetchSubscription({ customerId: "cus_123" })
      expect(result.error).toBeUndefined()
      expect(result.primarySubscription).not.toBeNull()
      expect(result.hasEverHadSubscription).toBe(true)
    })

    it("returns null if no active subscription is found", async () => {
      const stripe = await getStripe()
      ;(stripe.subscriptions.list as any).mockResolvedValue({ data: [] })

      const result = await fetchSubscription({ customerId: "cus_none" })
      expect(result.primarySubscription).toBeNull()
      expect(result.hasEverHadSubscription).toBe(false)
    })

    it("sets hasEverHadSubscription=false if there were never any subscriptions", async () => {
      const stripe = await getStripe()
      ;(stripe.subscriptions.list as any).mockResolvedValue({ data: [] })

      const result = await fetchSubscription({ customerId: "cus_never" })
      expect(result.hasEverHadSubscription).toBe(false)
    })

    it("maps active subscription for another known product (timeline_c)", async () => {
      const stripe = await getStripe()
      ;(stripe.subscriptions.list as any).mockResolvedValue({
        data: [
          {
            id: "sub_hub",
            status: "active",
            items: { data: [{ price: { product: "prod_timeline_123" } }] },
          },
        ],
      })

      const result = await fetchSubscription({ customerId: "cus_abc" })
      expect(result.primarySubscription?.appSubscription.id).toBe("timeline_c")
    })
  })
})
