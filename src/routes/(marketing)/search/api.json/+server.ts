// src/routes/(marketing)/search/api.json/+server.ts
import { json, type RequestHandler } from "@sveltejs/kit"
import { buildSearchIndex } from "$lib/build_index"

export const prerender = false

// ---- Config ----
const ONE_HOUR_SEC = 60 * 60
const CLIENT_MAX_AGE_SEC = ONE_HOUR_SEC // browser cache ttl
const CDN_SMAXAGE_SEC = ONE_HOUR_SEC // shared cache ttl
const STALE_WHILE_REVALIDATE_SEC = 60 // allow brief staleness during revalidation

// Disable server memo-cache in dev so edits are reflected immediately
const SERVER_TTL_MS = import.meta.env.DEV ? 0 : ONE_HOUR_SEC * 1000

// ---- Lightweight, environment-agnostic ETag helper (no Node crypto) ----
function weakETagFrom(value: unknown): string {
  const s = typeof value === "string" ? value : JSON.stringify(value)
  // simple stable hash (djb2-like)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  const hex = (h >>> 0).toString(16)
  return `W/"${hex}-${s.length}"`
}

// ---- In-memory memoization with concurrency coalescing ----
type CacheEntry = {
  data: unknown
  etag: string
  builtAt: number
}
let cache: CacheEntry | null = null
let inflight: Promise<CacheEntry> | null = null

async function getIndex(): Promise<CacheEntry> {
  const now = Date.now()

  if (cache && SERVER_TTL_MS > 0 && now - cache.builtAt < SERVER_TTL_MS) {
    return cache
  }
  if (inflight) return inflight

  inflight = (async () => {
    const data = await buildSearchIndex()
    const etag = weakETagFrom(data)
    const entry: CacheEntry = { data, etag, builtAt: Date.now() }
    cache = entry
    inflight = null
    return entry
  })().catch((err) => {
    inflight = null
    throw err
  })

  return inflight
}

export const GET: RequestHandler = async ({ request, setHeaders }) => {
  try {
    const { data, etag } = await getIndex()

    // Conditional request short-circuit (304)
    const ifNoneMatch = request.headers.get("if-none-match")
    if (ifNoneMatch && ifNoneMatch === etag) {
      setHeaders({
        "Cache-Control": `public, max-age=${CLIENT_MAX_AGE_SEC}, s-maxage=${CDN_SMAXAGE_SEC}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SEC}`,
        ETag: etag,
      })
      return new Response(null, { status: 304 })
    }

    // Normal response
    setHeaders({
      "Cache-Control": `public, max-age=${CLIENT_MAX_AGE_SEC}, s-maxage=${CDN_SMAXAGE_SEC}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SEC}`,
      ETag: etag,
    })
    return json(data)
  } catch (e) {
    console.error("[search-index] build failed:", e)
    // Preserve JSON output shape on success; on error, return a generic JSON payload
    return json({ error: "Failed to build search index" }, { status: 500 })
  }
}
