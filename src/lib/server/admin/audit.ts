// src/lib/server/admin/audit.ts
import { supabaseAdmin } from "$lib/server/supabaseAdmin"
// If you have generated DB types, you can uncomment this and use the typed alias below
// import type { Database } from "$lib/DatabaseDefinitions"

/**
 * Minimal shape expected by the `admin_audit` table.
 * If you have Database types, prefer the commented alias below.
 */
type AdminAuditInsert = {
  actor: string
  action: string
  target: string
  meta?: unknown
}

// If you have Database types, you can replace the local type with this:
// type AdminAuditInsert = Database["public"]["Tables"]["admin_audit"]["Insert"]

/**
 * Recursively converts arbitrary data into JSON-safe values for storage:
 * - Dates -> ISO strings
 * - Errors -> { name, message, stack }
 * - BigInts -> strings
 * - Functions/Symbols/undefined -> removed
 * - Circular references -> "[Circular]"
 */
function toJsonSafe(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value // null | undefined
  const t = typeof value

  if (t === "string" || t === "number" || t === "boolean") return value
  if (t === "bigint") return value.toString()
  if (t === "symbol" || t === "function") return undefined

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (Array.isArray(value)) {
    const arr = value
      .map((v) => toJsonSafe(v, seen))
      .filter((v) => v !== undefined)
    return arr
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) return "[Circular]"
    seen.add(obj)

    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      const sv = toJsonSafe(v, seen)
      if (sv !== undefined) out[k] = sv
    }
    return out
  }

  // Fallback for unexpected types
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

/**
 * Write an administrative audit record.
 *
 * Inputs: (actorId, action, targetUserId, meta) unchanged.
 * Output: Promise<void> unchanged.
 * Side effect: Inserts { actor, action, target, meta } into `admin_audit`.
 * On failure, logs an error but does not throw.
 */
export async function audit(
  actorId: string,
  action: string,
  targetUserId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const safeMeta = toJsonSafe(meta)

  const row: AdminAuditInsert = {
    actor: actorId,
    action,
    target: targetUserId,
    meta: safeMeta,
  }

  // FIX: remove the single generic; let the typed client infer.
  // (Using a single generic here causes TS2558: Expected 2 type arguments.)
  const { error } = await supabaseAdmin.from("admin_audit").insert(row)

  if (error) {
    // Preserve non-throwing behavior; log for visibility.
    console.error("[audit] failed to insert admin_audit record:", {
      action,
      actorId,
      targetUserId,
      error: error.message,
    })
  }
}
