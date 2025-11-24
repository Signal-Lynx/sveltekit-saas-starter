// src/routes/(internal)/admin/logs/+page.server.ts
import type { PageServerLoad } from "./$types"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"

/**
 * Shape of a single audit log entry.
 */
type AuditRow = {
  id: string
  created_at: string
  actor: string | null
  actor_email: string | null
  action: string
  target: string | null
  target_email: string | null
  meta: Record<string, unknown> | null
}

/**
 * Tunables and helpers
 */
const MAX_ROWS = 200
const MAX_Q_LEN = 120
const SELECT_COLUMNS =
  "id, created_at, actor, actor_email, action, target, target_email, meta" as const

// Keep the original q for echoing back to the UI, but build a normalized
// version for safer filtering inside the OR clause.
function normalizeQuery(raw: string): string {
  // Trim, clamp length, collapse whitespace, and drop characters that could
  // interfere with PostgREST OR syntax (commas/parentheses).
  const trimmed = raw.trim().slice(0, MAX_Q_LEN)
  const collapsed = trimmed.replace(/\s+/g, " ")
  // Allow common email/identifier characters; replace everything else with a space.
  const safe = collapsed.replace(/[^\w@.+-]/g, " ").trim()
  return safe
}

function isUuid(v: string): boolean {
  // UUID v1–v5 (case-insensitive)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
}

export const load: PageServerLoad = async ({ url /*, setHeaders*/ }) => {
  // Caching is already handled by (internal)/admin/+layout.server.ts.

  const qOriginal = (url.searchParams.get("q") || "").trim()
  const q = normalizeQuery(qOriginal)

  // Base query: newest-first, hard cap on rows for safety.
  let query = supabaseAdmin
    .from("admin_audit_view")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS)

  if (q) {
    // Match by UUID (id) if it looks like one, or case-insensitive partials
    // on the text fields (emails + action). Avoid ILIKE on UUID columns to
    // prevent "uuid ~~* unknown" errors from Postgres.
    const orParts: string[] = []

    // Only text columns get ILIKE
    orParts.push(`actor_email.ilike.%${q}%`)
    orParts.push(`target_email.ilike.%${q}%`)
    orParts.push(`action.ilike.%${q}%`)

    // If the search term is a UUID, allow exact id match as well
    if (isUuid(q)) {
      orParts.unshift(`id.eq.${q}`)
    }

    query = query.or(orParts.join(","))
  }

  try {
    const { data, error } = await query
    if (error) {
      console.error("[admin/logs] load error:", error)
      return { entries: [] as AuditRow[], q: qOriginal }
    }
    return { entries: (data as AuditRow[]) ?? [], q: qOriginal }
  } catch (err) {
    console.error("[admin/logs] unexpected error:", err)
    return { entries: [] as AuditRow[], q: qOriginal }
  }
}
