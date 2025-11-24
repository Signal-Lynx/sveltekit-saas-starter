// src/lib/server/subscription.ts
import { allProducts, type Product } from "$lib/data/products"
import { env } from "$env/dynamic/private"
import { type LMEntitlement, type EntitlementStatus } from "$lib/types"
import * as https from "node:https"
import { URL } from "node:url"

/** Minimal user shape used across the app (same as event.locals.user). */
type MinimalUser = { id: string; email?: string | null }

/* ---------------------------------------------
   Access semantics & status ranks (stable)
----------------------------------------------*/

const ACTIVEISH: ReadonlySet<EntitlementStatus> = new Set([
  "active",
  "trial",
  "developer",
])

const statusRank: Record<EntitlementStatus, number> = {
  active: 3,
  developer: 2,
  trial: 1,
  inactive: 0,
  blocked: 0,
} as const

/* ---------------------------------------------
   Small in-memory protections (per-process)
----------------------------------------------*/

type LmEntCacheEntry = {
  at: number
  ents: LMEntitlement[]
}

// Per-process caches (safe for Node single-process or multiple workers independently)
const _lmEntCache: Map<string, LmEntCacheEntry> = new Map() // key: user.id
const _lmKeyBucket: Map<string, number[]> = new Map() // key: apiKey

/**
 * Simple sliding-window rate limiter for a given key.
 */
function _isAllowed(
  bucket: Map<string, number[]>,
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now()
  const arr = bucket.get(key)?.filter((ts) => now - ts < windowMs) ?? []
  if (arr.length >= limit) {
    bucket.set(key, arr)
    return false
  }
  arr.push(now)
  bucket.set(key, arr)
  return true
}

function _getCachedEntitlements(
  userId: string,
  ttlMs = 10_000,
): LMEntitlement[] | null {
  const e = _lmEntCache.get(userId)
  if (!e || Date.now() - e.at > ttlMs) return null
  return e.ents
}

function _setCachedEntitlements(userId: string, ents: LMEntitlement[]) {
  _lmEntCache.set(userId, { at: Date.now(), ents })
}

/* ---------------------------------------------
   Identifier normalization + fast lookup index
----------------------------------------------*/

const normalize = (s?: string | null) => (s ?? "").trim().toLowerCase()

type ProductWithStripe = Product & {
  stripe_product_id?: string | null
  stripe_price_id?: string | null
}

type ProductBillingMeta = Product & {
  stripe_mode?: "subscription" | "payment"
  hidden?: boolean
  price?: string | number
}

// Build stable maps once per module load
const byStripeProduct = new Map<string, Product>()
const byStripePrice = new Map<string, Product>()
const byInternalId = new Map<string, Product>()

for (const p of allProducts) {
  const ps = p as ProductWithStripe
  if (ps.stripe_product_id) {
    const key = normalize(ps.stripe_product_id)
    if (key && !byStripeProduct.has(key)) byStripeProduct.set(key, p)
  }
  if (ps.stripe_price_id) {
    const key = normalize(ps.stripe_price_id)
    if (key && !byStripePrice.has(key)) byStripePrice.set(key, p)
  }
  const internal = normalize(p.id)
  if (internal && !byInternalId.has(internal)) byInternalId.set(internal, p)
}

function mapIdentifierToProduct(
  identifier?: string | null,
): Product | undefined {
  const needle = normalize(identifier)
  if (!needle) return undefined
  return (
    byStripeProduct.get(needle) ||
    byStripePrice.get(needle) ||
    byInternalId.get(needle)
  )
}

/* ---------------------------------------------
   Config & toggles
----------------------------------------------*/

const IS_NODE =
  typeof process !== "undefined" && typeof process.versions?.node === "string"
const NODE_ENV = (
  ((typeof process !== "undefined" && process.env?.NODE_ENV) ||
    (env as any).NODE_ENV ||
    "development") as string
).toLowerCase()

// Toggle DoH + direct-IP fast path:
// - auto: enable in dev or when host looks like ngrok
// - on:   always enable (Node runtime only)
// - off:  disable (use plain fetch only)
const LM_FAST_PATH_MODE = String(env.LM_FAST_PATH ?? "auto").toLowerCase()

// Quiet by default; opt-in only via env.LM_DEBUG
const LM_DEBUG = /^(1|true|yes)$/i.test(String(env.LM_DEBUG ?? ""))

// DoH IP cache TTL (ms) — configurable
const LM_DOH_TTL_MS = Number(env.LM_DOH_TTL_MS ?? 5 * 60_000)

// Fast-path timeouts (ms) — configurable
const LM_FIRST_TIMEOUT_MS = Number(env.LM_HTTP_TIMEOUT_MS ?? 3000) // direct-IP attempt
const LM_RETRY_TIMEOUT_MS = Number(env.LM_HTTP_RETRY_TIMEOUT_MS ?? 2500) // fallback fetch

function shouldUseFastPath(host: string): boolean {
  if (!IS_NODE) return false
  if (LM_FAST_PATH_MODE === "on") return true
  if (LM_FAST_PATH_MODE === "off") return false
  // auto
  const looksLikeNgrok = /(^|\.)ngrok(-free)?\./i.test(host)
  return NODE_ENV !== "production" || looksLikeNgrok
}

/* ---------------------------------------------
   FAST + ROBUST LM HTTP (DoH + direct IP + fetch fallback)
   ⚠️ This section is battle-tested and intentionally unchanged in behavior.
----------------------------------------------*/

const KA_AGENT = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 15_000,
  maxSockets: 16,
})

type IpCacheEntry = { ips: string[]; at: number; idx: number }
const _ipCache: Map<string, IpCacheEntry> = new Map() // host -> rotating list of IPv4s

function _getIpsFromCache(
  host: string,
  ttlMs = LM_DOH_TTL_MS,
): string[] | null {
  const e = _ipCache.get(host)
  if (!e) return null
  if (Date.now() - e.at > ttlMs || e.ips.length === 0) return null
  return e.ips
}

function _rotateIp(host: string): string | null {
  const e = _ipCache.get(host)
  if (!e || e.ips.length === 0) return null
  e.idx = (e.idx + 1) % e.ips.length
  _ipCache.set(host, e)
  return e.ips[e.idx]
}

function isIPv4(s: string): boolean {
  const parts = s.split(".")
  if (parts.length !== 4) return false
  for (const p of parts) {
    if (p.length === 0 || /[^0-9]/.test(p)) return false
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) return false
  }
  return true
}

async function resolveHostnameViaDoH(hostname: string): Promise<string[]> {
  const dohUrl =
    "https://dns.google/resolve?name=" +
    encodeURIComponent(hostname) +
    "&type=A"
  if (LM_DEBUG) console.log("[DoH] Resolving " + hostname + " via " + dohUrl)

  // Short timeout to avoid hanging when DNS is blocked by VPNs/firewalls
  const ctrl = new AbortController()
  const tm = setTimeout(() => ctrl.abort(), 1500)
  try {
    const res = await fetch(dohUrl, { cache: "no-store", signal: ctrl.signal })
    if (!res.ok) throw new Error("DoH status " + res.status)
    const data = (await res.json()) as { Answer?: { data?: string }[] }
    const ips = (data.Answer ?? [])
      .map((a) => (a.data ? a.data.trim() : ""))
      .filter((ip) => isIPv4(ip))
    if (ips.length === 0) throw new Error("No A records")
    if (LM_DEBUG) console.log("[DoH] " + hostname + " -> " + ips.join(", "))
    _ipCache.set(hostname, { ips, at: Date.now(), idx: 0 })
    return ips
  } finally {
    clearTimeout(tm)
  }
}

function httpsGetViaIp(
  urlStr: string,
  headers: Record<string, string>,
  ip: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  const u = new URL(urlStr)
  const reqHeaders: Record<string, string> = { ...headers, Host: u.hostname }

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: ip,
      servername: u.hostname, // SNI for TLS
      port: u.port ? Number(u.port) : 443,
      path: u.pathname + u.search,
      method: "GET",
      headers: reqHeaders,
      agent: KA_AGENT,
    }

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8")
        resolve({ status: res.statusCode ?? 0, body })
      })
    })

    req.on("error", (err) => reject(err))
    req.setTimeout(timeoutMs, () =>
      req.destroy(new Error("timeout " + timeoutMs + "ms")),
    )
    req.end()
  })
}

async function lmFastJson(
  urlStr: string,
  headers: Record<string, string>,
  firstTimeoutMs: number,
  retryTimeoutMs: number,
): Promise<LMEntitlement[]> {
  const u = new URL(urlStr)
  const host = u.hostname

  let ips = _getIpsFromCache(host)
  if (!ips) {
    try {
      ips = await resolveHostnameViaDoH(host)
    } catch {
      // ignore; we will fall back to plain fetch below
    }
  }

  if (ips && ips.length) {
    // Try a few direct IPs quickly
    const attempts = Math.min(ips.length, 3)
    for (let i = 0; i < attempts; i++) {
      const ip = i === 0 ? ips[0] : _rotateIp(host) || ips[0]
      if (LM_DEBUG) console.log("[LM] direct-IP try " + ip + " for " + host)
      try {
        const r1 = await httpsGetViaIp(urlStr, headers, ip, firstTimeoutMs)
        if (r1.status >= 200 && r1.status < 300) {
          return r1.body ? (JSON.parse(r1.body) as LMEntitlement[]) : []
        }
      } catch {
        // try next IP
      }
    }
  }

  // Fallback: plain fetch with its own (short) timeout
  const ctrl = new AbortController()
  const t = setTimeout(
    () => ctrl.abort(),
    Math.max(2_000, Math.min(5_000, retryTimeoutMs)),
  )
  try {
    const res = await fetch(urlStr, {
      headers,
      signal: ctrl.signal,
      cache: "no-store",
    })
    const txt = await res.text()
    if (res.ok) return txt ? (JSON.parse(txt) as LMEntitlement[]) : []
    throw new Error("LM HTTP " + res.status + ": " + txt)
  } finally {
    clearTimeout(t)
  }
}

async function fetchJsonWithTimeout(
  urlStr: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<LMEntitlement[]> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(urlStr, {
      headers,
      signal: ctrl.signal,
      cache: "no-store",
    })
    const txt = await res.text()
    if (!res.ok) throw new Error(`LM HTTP ${res.status}: ${txt}`)
    return txt ? (JSON.parse(txt) as LMEntitlement[]) : []
  } finally {
    clearTimeout(t)
  }
}

/* ---------------------------------------------
   Generic fast-path request (GET/POST/etc) — Response-like
----------------------------------------------*/

export async function lmFetch(
  urlStr: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string | Buffer | Uint8Array
    firstTimeoutMs?: number
    retryTimeoutMs?: number
  },
): Promise<{
  ok: boolean
  status: number
  text(): Promise<string>
  json<T = any>(): Promise<T>
}> {
  const method = (init?.method ?? "GET").toUpperCase()
  const headers = { ...(init?.headers ?? {}) }

  // Normalize for runtime (no behavior change):
  // - string stays string
  // - Buffer is a Uint8Array at runtime
  // - Uint8Array stays Uint8Array
  const body: string | Uint8Array | undefined =
    typeof init?.body === "string"
      ? init.body
      : init?.body
        ? (init.body as unknown as Uint8Array)
        : undefined

  const firstTimeoutMs = init?.firstTimeoutMs ?? LM_FIRST_TIMEOUT_MS
  const retryTimeoutMs = init?.retryTimeoutMs ?? LM_RETRY_TIMEOUT_MS

  const u = new URL(urlStr)
  const host = u.hostname

  const makeResp = (status: number, bodyStr: string) => ({
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return bodyStr
    },
    async json<T = any>() {
      return bodyStr ? (JSON.parse(bodyStr) as T) : (undefined as any)
    },
  })

  if (shouldUseFastPath(host)) {
    let ips = _getIpsFromCache(host)
    if (!ips) {
      try {
        ips = await resolveHostnameViaDoH(host)
      } catch {
        // ignore and fall back below
      }
    }

    if (ips && ips.length) {
      const attempts = Math.min(ips.length, 3)

      const reqViaIp = (
        ip: string,
      ): Promise<{ status: number; body: string }> =>
        new Promise((resolve, reject) => {
          const reqHeaders: Record<string, string> = {
            ...headers,
            Host: u.hostname,
          }
          const options: https.RequestOptions = {
            hostname: ip,
            servername: u.hostname, // TLS SNI
            port: u.port ? Number(u.port) : 443,
            path: u.pathname + u.search,
            method,
            headers: reqHeaders,
            agent: KA_AGENT,
          }
          const req = https.request(options, (res) => {
            const chunks: Buffer[] = []
            res.on("data", (c) => chunks.push(c))
            res.on("end", () =>
              resolve({
                status: res.statusCode ?? 0,
                body: Buffer.concat(chunks).toString("utf8"),
              }),
            )
          })
          req.on("error", (err) => reject(err))
          req.setTimeout(firstTimeoutMs, () =>
            req.destroy(new Error(`timeout ${firstTimeoutMs}ms`)),
          )
          if (body) req.write(body)
          req.end()
        })

      for (let i = 0; i < attempts; i++) {
        const ip = i === 0 ? ips[0] : _rotateIp(host) || ips[0]
        if (LM_DEBUG) console.log(`[LM] direct-IP ${method} ${ip} for ${host}`)
        try {
          const r = await reqViaIp(ip)
          if (r.status >= 200 && r.status < 300)
            return makeResp(r.status, r.body)
        } catch {
          // try next IP
        }
      }
    }
  }

  // Fallback: plain fetch with short timeout
  const ctrl = new AbortController()
  const t = setTimeout(
    () => ctrl.abort(),
    Math.max(2_000, Math.min(5_000, retryTimeoutMs)),
  )
  try {
    const res = await fetch(urlStr, {
      method,
      headers,
      // TS: Some DOM typings lack Uint8Array in BodyInit; runtime is fine in Node/undici.
      body: body as any,
      signal: ctrl.signal,
      cache: "no-store",
    })
    const txt = await res.text()
    return makeResp(res.status, txt)
  } finally {
    clearTimeout(t)
  }
}

/* ---------------------------------------------
   Subscription state (calls LM once; pure logic after)
----------------------------------------------*/

export async function getUserSubscriptionState(
  user: MinimalUser,
  ctx?: { clientIp?: string; requestId?: string; forceReload?: boolean },
) {
  let entitlements: LMEntitlement[] = []
  let lmError: string | null = null

  const baseUrl = env.PRIVATE_LICENSE_MANAGER_URL
  const apiKey = env.PRIVATE_LICENSE_MANAGER_API_KEY

  if (!baseUrl || !apiKey) {
    console.error("[subscription] Missing License Manager env vars.")
    return {
      isActiveCustomer: false,
      hasEverHadSubscription: false,
      currentPlanId: undefined as string | undefined,
      currentPlan: undefined as Product | undefined,
      planStatus: undefined as EntitlementStatus | undefined,
      ownedProductIds: [] as string[],
      entitlements: [] as LMEntitlement[],
      lmError: "License Manager is not configured.",
    }
  }

  // Clear & readable cache bypass
  const cacheTtlMs = ctx?.forceReload ? 0 : 10_000
  const cached = cacheTtlMs ? _getCachedEntitlements(user.id, cacheTtlMs) : null
  if (cached) {
    entitlements = cached
  } else {
    // Light key-based throttling to protect LM on bursts
    if (!_isAllowed(_lmKeyBucket, `k:${apiKey}`, 30, 10_000)) {
      lmError = "License server is busy. Please retry shortly."
    }

    if (!lmError) {
      try {
        const lmBase = baseUrl.replace(/\/+$/, "")
        const url = `${lmBase}/api/v1/internal/user-entitlements/${user.id}`
        const headers: Record<string, string> = {
          Accept: "application/json",
          "X-Internal-API-Key": String(apiKey),
          "ngrok-skip-browser-warning": "true",
        }
        if (ctx?.clientIp) headers["X-Forwarded-For"] = ctx.clientIp
        if (ctx?.requestId) headers["X-Request-ID"] = ctx.requestId

        const host = new URL(url).hostname
        if (shouldUseFastPath(host)) {
          // ⚠️ fast-path preserved as-is
          entitlements = await lmFastJson(
            url,
            headers,
            LM_FIRST_TIMEOUT_MS,
            LM_RETRY_TIMEOUT_MS,
          )
        } else {
          // Plain fetch only (production default unless ngrok-like host)
          entitlements = await fetchJsonWithTimeout(
            url,
            headers,
            LM_FIRST_TIMEOUT_MS + LM_RETRY_TIMEOUT_MS,
          )
        }

        _setCachedEntitlements(user.id, entitlements)
      } catch (e) {
        console.error(
          `Failed to connect to License Manager for user ${user.id}`,
          e,
        )
        lmError =
          "The license server is currently unreachable. Please try again later."
      }
    }
  }

  // Build owned product set (best status per product)
  const ownedProductIdsSet = new Set<string>()
  for (const e of entitlements) {
    const st = e.status as EntitlementStatus
    if (!ACTIVEISH.has(st)) continue
    const p =
      mapIdentifierToProduct(e.product_identifier) ||
      mapIdentifierToProduct(e.tier_identifier)
    if (p) ownedProductIdsSet.add(p.id)
  }
  const ownedProductIds = Array.from(ownedProductIdsSet)

  // Determine best current plan by status rank, then by allProducts order
  const productOrder = new Map<string, number>()
  allProducts.forEach((p, idx) => productOrder.set(p.id, idx))

  let best: { product: Product; status: EntitlementStatus } | null = null
  for (const e of entitlements) {
    const st = e.status as EntitlementStatus
    if (!ACTIVEISH.has(st)) continue
    const p =
      mapIdentifierToProduct(e.product_identifier) ||
      mapIdentifierToProduct(e.tier_identifier)
    if (!p) continue

    if (!best) {
      best = { product: p, status: st }
      continue
    }
    const currRank = statusRank[st] ?? 0
    const prevRank = statusRank[best.status] ?? 0
    if (currRank > prevRank) {
      best = { product: p, status: st }
    } else if (currRank === prevRank) {
      const prevOrder = productOrder.get(best.product.id) ?? Infinity
      const currOrder = productOrder.get(p.id) ?? Infinity
      if (currOrder < prevOrder) best = { product: p, status: st }
    }
  }

  const currentPlan = best?.product
  const currentPlanId = currentPlan?.id
  const planStatus = best?.status
  const isActiveCustomer = ownedProductIds.length > 0
  const hasEverHadSubscription = entitlements.length > 0

  return {
    isActiveCustomer,
    hasEverHadSubscription,
    currentPlanId,
    currentPlan,
    planStatus,
    ownedProductIds,
    entitlements,
    lmError,
  }
}

/* ---------------------------------------------
   Helpers to present entitlements
----------------------------------------------*/

export type ActiveProductRow = {
  id: string
  name: string
  status: EntitlementStatus
}

export function entitlementsToActiveProducts(
  entitlements: LMEntitlement[] | undefined | null,
): ActiveProductRow[] {
  if (!entitlements?.length) return []
  const order = new Map<string, number>()
  allProducts.forEach((p, idx) => {
    if (!order.has(p.id)) order.set(p.id, idx)
  })
  const bestByProduct = new Map<string, ActiveProductRow>()

  for (const e of entitlements) {
    const st = e.status as EntitlementStatus
    if (!ACTIVEISH.has(st)) continue
    const p =
      mapIdentifierToProduct(e.product_identifier) ||
      mapIdentifierToProduct(e.tier_identifier)
    if (!p) continue

    const existing = bestByProduct.get(p.id)
    const currRank = statusRank[st] ?? 0
    const prevRank = existing ? (statusRank[existing.status] ?? 0) : -1
    if (!existing || currRank > prevRank) {
      bestByProduct.set(p.id, { id: p.id, name: p.name, status: st })
    }
  }

  return Array.from(bestByProduct.values()).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
}

export type BillingKind = "subscription" | "one-time" | "included"

export type ActiveProductRowWithDates = {
  id: string
  name: string
  status: EntitlementStatus
  renews_at?: string | null
  trial_ends_at?: string | null
  kind: BillingKind
}

export function entitlementsToActiveProductsWithDates(
  entitlements: LMEntitlement[] | undefined | null,
): ActiveProductRowWithDates[] {
  if (!entitlements?.length) return []
  const order = new Map<string, number>()
  allProducts.forEach((p, idx) => {
    if (!order.has(p.id)) order.set(p.id, idx)
  })
  const bestByProduct = new Map<string, ActiveProductRowWithDates>()

  for (const e of entitlements) {
    const st = e.status as EntitlementStatus
    if (!ACTIVEISH.has(st)) continue
    const p =
      mapIdentifierToProduct(e.product_identifier) ||
      mapIdentifierToProduct(e.tier_identifier)
    if (!p) continue

    const existing = bestByProduct.get(p.id)
    const currRank = statusRank[st] ?? 0
    const prevRank = existing ? (statusRank[existing.status] ?? 0) : -1

    const pm = p as ProductBillingMeta
    const mode = pm.stripe_mode
    const isHidden = !!pm.hidden
    const priceVal = pm.price
    const priceTxt =
      typeof priceVal === "number" ? String(priceVal) : (priceVal ?? "")
    const isFree = /^\s*(?:\$?\s*0(?:\.0{1,2})?|free)\s*$/i.test(priceTxt)
    const kind: BillingKind =
      mode === "subscription"
        ? "subscription"
        : isHidden || isFree
          ? "included"
          : "one-time"

    if (!existing || currRank > prevRank) {
      bestByProduct.set(p.id, {
        id: p.id,
        name: p.name,
        status: st,
        renews_at: e.renews_at ?? null,
        trial_ends_at: e.trial_ends_at ?? null,
        kind,
      })
    }
  }

  return Array.from(bestByProduct.values()).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
}
