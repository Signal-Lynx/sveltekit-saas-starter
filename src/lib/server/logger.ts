// Lightweight, zero-dep JSON logger.
// Public API preserved:
//   - export function log(level, msg, fields?)
//   - export function withContext(extraFields)
//
// Enhancements:
//   • Safe JSON serialization (Error/Date/BigInt/circular/function handling).
//   • Stable console method mapping with graceful fallback.
//   • Strong typing and defensive guards.
//   • Immutable base metadata and child loggers.

type Fields = Record<string, unknown>

const base = Object.freeze({ app: "signal-lynx", v: 1 as const })

type Level = "debug" | "info" | "warn" | "error"

const LEVEL_TO_CONSOLE: Record<Level, "debug" | "info" | "warn" | "error"> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
}

/**
 * JSON.stringify with safety features:
 * - Error -> { name, message, stack?, ...custom enumerable props }
 * - Date  -> ISO string
 * - BigInt -> string
 * - Functions -> omitted (undefined)
 * - Circular refs -> "[Circular]"
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  return JSON.stringify(value, (_key, val) => {
    // BigInt must be stringified manually
    if (typeof val === "bigint") return val.toString()

    // Errors carry useful context
    if (val instanceof Error) {
      const out: Record<string, unknown> = {
        name: val.name,
        message: val.message,
      }
      if (typeof val.stack === "string") out.stack = val.stack

      // Include any own enumerable custom props on the Error (no casts to Record)
      for (const k of Object.keys(val as object)) {
        if (out[k] === undefined) {
          out[k] = (val as any)[k] // accessing own enumerable prop
        }
      }
      return out
    }

    // Dates as ISO for readability (if valid)
    if (val instanceof Date)
      return isFinite(val.valueOf()) ? val.toISOString() : null

    // Handle circular structures
    if (val && typeof val === "object") {
      const obj = val as object
      if (seen.has(obj)) return "[Circular]"
      seen.add(obj)
    }

    // Drop functions (JSON would do this anyway, but explicit is nice)
    if (typeof val === "function") return undefined

    return val
  })
}

/**
 * Emit a single structured log line.
 */
export function log(level: Level, msg: string, fields: Fields = {}): void {
  // Construct payload with stable key order
  const payload: Fields = { ...base, level, msg, t: Date.now(), ...fields }

  // Serialize safely
  let line: string
  try {
    line = safeStringify(payload)
  } catch {
    // Extremely defensive fallback (shouldn't happen due to safeStringify)
    line = JSON.stringify({ ...base, level, msg, t: Date.now() })
  }

  // Choose console method with fallback
  const method = LEVEL_TO_CONSOLE[level] ?? "log"
  const fn =
    (console as unknown as Record<string, (s: string) => void>)[method] ||
    console.log
  fn.call(console, line)
}

/**
 * Create a logger with pre-bound context fields.
 * The returned logger object is immutable.
 */
export function withContext(extra: Fields) {
  const ctx: Fields = extra ?? {}
  return Object.freeze({
    debug: (msg: string, f: Fields = {}) => log("debug", msg, { ...ctx, ...f }),
    info: (msg: string, f: Fields = {}) => log("info", msg, { ...ctx, ...f }),
    warn: (msg: string, f: Fields = {}) => log("warn", msg, { ...ctx, ...f }),
    error: (msg: string, f: Fields = {}) => log("error", msg, { ...ctx, ...f }),
  })
}
