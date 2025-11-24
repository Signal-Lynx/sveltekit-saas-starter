// src/routes/(admin)/account/(menu)/downloads/+page.server.ts
import { redirect } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"
import { allProducts, type Product } from "$lib/data/products"
import type { LMEntitlement } from "$lib/types"
import { env } from "$env/dynamic/private"
import { lmFetch } from "$lib/server/subscription"
import { loadSubscriptionState } from "$lib/server/subscriptionLoader"
import { DOWNLOAD_PREFIXES, SECURE_DOWNLOADS_BASE } from "../../../../../config"
import { listFiles, type R2File } from "$lib/server/r2"
import { README_PREFIXES, PUBLIC_ASSETS_BASE } from "../../../../../config"

// -------------------------------
// Helpers & Constants
// -------------------------------

// New buckets for Paradox Innovations
type Bucket = "hoverboard" | "timeline_c"
const ACTIVEISH = new Set<string>(["active", "trial", "developer"])

const normalize = (s?: string | null): string => (s ?? "").trim().toLowerCase()

// Map stripe product/price ids -> Product
const productLookup: ReadonlyMap<string, Product> = (() => {
  const m = new Map<string, Product>()
  for (const p of allProducts) {
    const ids = [p.stripe_product_id, p.stripe_price_id]
    for (const id of ids) {
      const key = normalize(id)
      if (key && !m.has(key)) m.set(key, p)
    }
  }
  return m
})()

const mapIdentifierToProduct = (
  identifier?: string | null,
): Product | undefined => {
  const key = normalize(identifier)
  if (!key) return undefined
  return productLookup.get(key)
}

// Updated mapping logic
const resolveByName = (
  productName?: string | null,
  tierName?: string | null,
): Bucket | undefined => {
  const blob = `${normalize(productName)} ${normalize(tierName)}`
  if (!blob.trim()) return undefined
  if (blob.includes("hover") || blob.includes("gravity")) return "hoverboard"
  if (blob.includes("timeline")) return "timeline_c"
  return undefined
}

const isActiveish = (status?: string | null): boolean => {
  if (!status) return false
  return ACTIVEISH.has(status)
}

// Map internal product IDs to buckets
const BUCKET_BY_PRODUCT_ID: Record<string, Bucket | undefined> = {
  hoverboard: "hoverboard",
  antigrav: "hoverboard", // Subscription includes the download
  timeline_c: "timeline_c",
}

// Pick the most recently modified file's URL from an R2 listing
function latestUrl(files: R2File[] | undefined): string | null {
  if (!files || files.length === 0) return null
  const sorted = [...files].sort(
    (a, b) =>
      (b.lastModified?.getTime?.() ?? 0) - (a.lastModified?.getTime?.() ?? 0),
  )
  return sorted[0]?.url ?? null
}

// -------------------------------
type Entitlements = { [K in Bucket]: boolean }

export const load: PageServerLoad = async (event) => {
  const { subscriptionState } = await loadSubscriptionState(event)

  const entitlements: Entitlements = {
    hoverboard: false,
    timeline_c: false,
  }

  const hoverLicenses: LMEntitlement[] = []
  const timelineLicenses: LMEntitlement[] = []

  const items: LMEntitlement[] = (subscriptionState?.entitlements ??
    []) as unknown as LMEntitlement[]

  for (const e of items) {
    if (!isActiveish(e.status)) continue
    const key = e.license_key?.trim()
    if (!key) continue

    const primaryId = e.product_identifier
    const secondaryId = e.tier_identifier

    let bucket: Bucket | undefined
    const matchedProduct =
      mapIdentifierToProduct(primaryId) ?? mapIdentifierToProduct(secondaryId)

    if (matchedProduct) {
      bucket = BUCKET_BY_PRODUCT_ID[matchedProduct.id]
    }

    if (!bucket) {
      bucket = resolveByName(e.product_display_name, e.tier_display_name)
    }

    if (!bucket) {
      console.warn("downloads: unmatched entitlement", {
        product_identifier: e.product_identifier,
        tier_identifier: e.tier_identifier,
        product_display_name: e.product_display_name,
        tier_display_name: e.tier_display_name,
        status: e.status,
      })
      continue
    }

    if (bucket === "hoverboard") {
      entitlements.hoverboard = true
      hoverLicenses.push(e)
    } else if (bucket === "timeline_c") {
      entitlements.timeline_c = true
      timelineLicenses.push(e)
    }
  }

  const sortLicenses = (arr: LMEntitlement[]) =>
    arr.sort((a, b) => (a.license_key ?? "").localeCompare(b.license_key ?? ""))

  // Fetch file lists from R2 for entitled products + public READMEs
  const [
    hoverDownloads,
    timelineDownloads,

    // public READMEs
    hoverReadmes,
    timelineReadmes,
  ] = await Promise.all([
    // secure downloads (entitled)
    entitlements.hoverboard
      ? listFiles(DOWNLOAD_PREFIXES.hoverboard, SECURE_DOWNLOADS_BASE)
      : [],
    entitlements.timeline_c
      ? listFiles(DOWNLOAD_PREFIXES.timeline_c, SECURE_DOWNLOADS_BASE)
      : [],

    // public READMEs (explicit bucket = public assets)
    listFiles(
      README_PREFIXES.hoverboard,
      PUBLIC_ASSETS_BASE,
      env.PRIVATE_R2_PUBLIC_BUCKET_NAME,
    ),
    listFiles(
      README_PREFIXES.timeline_c,
      PUBLIC_ASSETS_BASE,
      env.PRIVATE_R2_PUBLIC_BUCKET_NAME,
    ),
  ])

  const filesByProduct = {
    hoverboard: hoverDownloads,
    timeline_c: timelineDownloads,
  }

  // pick latest README per product by lastModified
  const readmeUrls = {
    hoverboard: latestUrl(hoverReadmes),
    timeline_c: latestUrl(timelineReadmes),
  }

  return {
    entitlements,
    licensesByProduct: {
      hoverboard: sortLicenses(hoverLicenses),
      timeline_c: sortLicenses(timelineLicenses),
    },
    subscriptionState,
    filesByProduct,
    readmeUrls,
  }
}

// -------------------------------
// Actions (unchanged logic, just here for completeness)
// -------------------------------
export const actions: Actions = {
  refresh: async ({ cookies, locals, getClientAddress }) => {
    // allow a fresh claim attempt
    cookies.delete("lm_claim_check", { path: "/" })

    const user = locals?.user
    if (!user?.id || !user?.email) {
      throw redirect(303, "/login?next=/account/downloads")
    }

    const lmBase = env.PRIVATE_LICENSE_MANAGER_URL?.replace(/\/+$/, "")
    const lmKey =
      env.PRIVATE_LM_INTERNAL_API_KEY || env.PRIVATE_LICENSE_MANAGER_API_KEY
    if (!lmBase || !lmKey) {
      console.error("[Claim License] Missing LM env; skipping claim.")
      throw redirect(303, "/account/downloads?refreshed=true")
    }

    const ip =
      (locals as any)?.clientIp ??
      (typeof getClientAddress === "function"
        ? getClientAddress()
        : undefined) ??
      "0.0.0.0"
    const rid =
      (locals as any)?.requestId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2))

    // 1) Robust POST via lmFetch (awaited)
    let ok = false
    let status = 0
    let body = ""
    try {
      const r = await lmFetch(
        `${lmBase}/api/v1/internal/licenses/claim-by-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": lmKey,
            "X-Forwarded-For": ip,
            "X-Request-ID": rid,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            supabase_user_id: user.id,
            email: user.email,
          }),
          firstTimeoutMs: 2_500,
          retryTimeoutMs: 8_000,
        },
      )
      status = r.status
      body = await r.text()
      ok = r.ok
    } catch (e) {
      console.warn(
        "[Refresh Arsenal] lmFetch threw; falling back to native fetch:",
        e,
      )
      // 2) Last-resort native fetch (in case lmFetch throws)
      try {
        const ac = new AbortController()
        const to = setTimeout(() => ac.abort(), 8_000)
        const r = await fetch(
          `${lmBase}/api/v1/internal/licenses/claim-by-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-API-Key": lmKey,
              "X-Forwarded-For": ip,
              "X-Request-ID": rid,
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({
              supabase_user_id: user.id,
              email: user.email,
            }),
            signal: ac.signal,
            cache: "no-store",
          },
        )
        clearTimeout(to)
        status = r.status
        body = await r.text()
        ok = r.ok
      } catch (e2) {
        status = 0
        body = `fallback fetch failed: ${String(e2)}`
        ok = false
      }
    }

    if (!ok) {
      console.warn(
        `[Refresh Arsenal] Claim FAILED status=${status} body=${body.slice(0, 600)}`,
      )
    } else {
      console.log(`[Refresh Arsenal] Claim OK status=${status}`)
    }

    // reload entitlements with a cache-buster
    throw redirect(303, "/account/downloads?refreshed=true&bust=" + Date.now())
  },
}
