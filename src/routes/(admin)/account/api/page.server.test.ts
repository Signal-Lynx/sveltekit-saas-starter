// src/routes/(admin)/account/api/page.server.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { actions } from "./+page.server"
import { fail, redirect } from "@sveltejs/kit"

// ----------------------------
// Hoisted admin client double
// ----------------------------
const H = vi.hoisted(() => {
  // We emulate the minimal Supabase PostgREST-style chain used by the action:
  // from('profiles').select(...).eq('id', user.id).single()
  // and separately: update({...}).eq('id', user.id).select().single()
  return {
    admin: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(), // will be used for the initial read
      update: vi.fn(), // we replace return value per-test with a chain mock
    },
  }
})

// ----------------------------
// Mock SvelteKit helpers
// ----------------------------
vi.mock("@sveltejs/kit", async () => {
  const actual =
    await vi.importActual<typeof import("@sveltejs/kit")>("@sveltejs/kit")
  return {
    ...actual,
    // `fail` in SvelteKit returns a special object; here we keep a predictable
    // value so code that returns `fail(...)` still behaves.
    fail: vi.fn().mockImplementation((status: number, data: unknown) => ({
      status,
      data,
    })),
    // `redirect` throws internally; we mimic that with a recognizable error.
    redirect: vi.fn().mockImplementation(() => {
      throw new Error("Redirect error")
    }),
  }
})

// ----------------------------
// Mock the admin client used by the action
// ----------------------------
vi.mock("$lib/server/supabaseAdmin", () => ({
  supabaseAdmin: H.admin,
}))

// ----------------------------
// Small helpers for clarity
// ----------------------------
type UpdateChainResult =
  | { data: unknown; error: null }
  | { data: null; error: Error }

// Builds a fresh chain object for the UPDATE step: .eq().select().single()
function makeUpdateChain(result: UpdateChainResult) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValueOnce(result),
  }
  return chain
}

// Builds a minimal event-like object accepted by the action
function makeEvent(locals: unknown) {
  return { locals } as any
}

describe("toggleEmailSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-affirm default chain behavior for the "read" path.
    H.admin.from.mockReturnThis()
    H.admin.select.mockReturnThis()
    H.admin.eq.mockReturnThis()
  })

  afterEach(() => {
    // Nothing specific to restore beyond clearAllMocks, but leaving this hook
    // makes it easy to add teardown later if needed.
  })

  it("should redirect if no user", async () => {
    await expect(
      actions.toggleEmailSubscription(makeEvent({ user: null })),
    ).rejects.toThrow("Redirect error")

    expect(redirect).toHaveBeenCalledWith(303, "/login")
    // Ensure we *didn't* touch the DB in this path
    expect(H.admin.from).not.toHaveBeenCalled()
    expect(H.admin.update).not.toHaveBeenCalled()
  })

  it("should toggle subscription status from false to true", async () => {
    const mockUser = { id: "user123" }

    // Initial read returns unsubscribed: false
    H.admin.single.mockResolvedValueOnce({
      data: { unsubscribed: false },
      error: null,
    })

    // Update chain should result in unsubscribed: true
    const updateChain = makeUpdateChain({
      data: { unsubscribed: true },
      error: null,
    })
    ;(H.admin.update as any).mockReturnValue(updateChain)

    const result = await actions.toggleEmailSubscription(
      makeEvent({ user: mockUser }),
    )

    // Read path checks
    expect(H.admin.from).toHaveBeenCalledWith("profiles")
    expect(H.admin.eq).toHaveBeenCalledWith("id", "user123")

    // Update path checks
    expect(H.admin.update).toHaveBeenCalledWith({ unsubscribed: true })
    expect(updateChain.eq).toHaveBeenCalledWith("id", "user123")

    // Action result
    expect(result).toEqual({ unsubscribed: true })
  })

  it("should toggle subscription status from true to false", async () => {
    const mockUser = { id: "user123" }

    // Initial read returns unsubscribed: true
    H.admin.single.mockResolvedValueOnce({
      data: { unsubscribed: true },
      error: null,
    })

    // Update chain should result in unsubscribed: false
    const updateChain = makeUpdateChain({
      data: { unsubscribed: false },
      error: null,
    })
    ;(H.admin.update as any).mockReturnValue(updateChain)

    const result = await actions.toggleEmailSubscription(
      makeEvent({ user: mockUser }),
    )

    // Read path checks
    expect(H.admin.from).toHaveBeenCalledWith("profiles")
    expect(H.admin.eq).toHaveBeenCalledWith("id", "user123")

    // Update path checks
    expect(H.admin.update).toHaveBeenCalledWith({ unsubscribed: false })
    expect(updateChain.eq).toHaveBeenCalledWith("id", "user123")

    // Action result
    expect(result).toEqual({ unsubscribed: false })
  })

  it("should return fail response if update operation fails", async () => {
    const mockUser = { id: "user123" }

    // Initial read returns unsubscribed: false
    H.admin.single.mockResolvedValueOnce({
      data: { unsubscribed: false },
      error: null,
    })

    // Update chain fails at `single()`
    const updateChain = makeUpdateChain({
      data: null,
      error: new Error("DB error"),
    })
    ;(H.admin.update as any).mockReturnValue(updateChain)

    await actions.toggleEmailSubscription(makeEvent({ user: mockUser }))

    expect(fail).toHaveBeenCalledWith(500, {
      message: "Failed to update subscription status",
    })
    // Ensure intended update payload and targeting were attempted
    expect(H.admin.update).toHaveBeenCalledWith({ unsubscribed: true })
    expect(updateChain.eq).toHaveBeenCalledWith("id", "user123")
  })
})
