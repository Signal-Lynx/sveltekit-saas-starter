// src/routes/(internal)/admin/customers/+page.server.ts
import type { Actions, PageServerLoad } from "./$types"
import { searchCustomersByEmail } from "$lib/server/admin/customers"

/**
 * Keep queries sane without changing semantics:
 * - trim + collapse whitespace
 * - strip control characters
 * - cap maximum length to avoid abuse
 * NOTE: We do NOT enforce email shape to preserve partial search behavior.
 */
const MAX_QUERY_CHARS = 320
function sanitize(input: unknown): string {
  if (typeof input !== "string") return ""
  const normalized = input
    .replace(/[\u0000-\u001F\u007F]/g, " ") // strip control chars
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
  return normalized.slice(0, MAX_QUERY_CHARS)
}

// Preserve original load contract exactly.
export const load: PageServerLoad = async () => {
  // Caching headers are handled by (internal)/admin/+layout.server.ts.
  return { results: [] as Awaited<ReturnType<typeof searchCustomersByEmail>> }
}

export const actions: Actions = {
  search: async ({ request }) => {
    const started = Date.now()

    type SearchResults = Awaited<ReturnType<typeof searchCustomersByEmail>>
    let results: SearchResults = []

    try {
      const formData = await request.formData()
      const raw = formData.get("email")
      const cleaned = sanitize(raw)

      if (!cleaned) {
        // Match original behavior: empty query => empty results.
        return { results }
      }

      // Normalize for case-insensitive matching without changing semantics.
      const query = cleaned.toLowerCase()

      // Delegate to domain search; ensure we never leak exceptions to the client.
      results = await searchCustomersByEmail(query)
    } catch (err) {
      // Fail closed with empty results; surface details only in server logs.
      console.error("[admin/customers.search] error:", err)
      results = []
    } finally {
      const ms = Date.now() - started
      // Lightweight timing for ops visibility (no PII).
      console.debug(`[admin/customers.search] completed in ${ms}ms`)
    }

    // Preserve exact action output shape.
    return { results }
  },
} satisfies Actions
