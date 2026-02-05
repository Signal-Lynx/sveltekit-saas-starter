// src/routes/(marketing)/sitemap.xml/+server.ts
import type { RequestHandler } from "@sveltejs/kit"
import { WebsiteBaseUrl } from "../../../config"
import { dev } from "$app/environment"
import { articlesMeta } from "$lib/data/articles/meta"

export const prerender = false

/**
 * Normalize and validate the sitemap origin.
 */
function resolveOrigin(fallbackOrigin: string): string {
  const candidate = (WebsiteBaseUrl ?? "").trim()
  try {
    const u = new URL(candidate || fallbackOrigin)
    // Remove trailing slash for consistency
    return u.origin.endsWith("/") && u.pathname === ""
      ? u.origin.slice(0, -1)
      : u.origin
  } catch {
    return fallbackOrigin
  }
}

// Basic XML escape helper to ensure valid XML
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Patterns to exclude from the sitemap
const EXCLUDE_URL_PATTERNS: readonly RegExp[] = [
  /^\/account(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/login(\/|$)/, // Often handled by hooks, but good to be explicit
  /^\/api(\/|$)/,
  /^\/access(\/|$)/,
  /^\/test(\/|$)/,
  /^\/test-email(\/|$)/,
  /^\/legal\/subprocessors(\/|$)/,
  /^\/legal\/promotions-rules(\/|$)/,
  /^\/legal\/open-source(\/|$)/,
  /^\/search(\/|$)/,
] as const

function isExcluded(urlPath: string): boolean {
  return EXCLUDE_URL_PATTERNS.some((re) => re.test(urlPath))
}

// Convert filesystem paths to clean URLs
function routeIdToUrlPath(routeId: string): string | null {
  // If it's in the internal admin section, ignore
  if (routeId.includes("/(internal)/")) return null

  // 1. Remove the filename (simple string replace is safer than regex here)
  let p = routeId.replace("/+page.svelte", "")

  // 2. Remove the src/routes prefix (handle leading slash or not)
  p = p.replace(/^\/?src\/routes/, "")

  // 3. Remove route groups like /(marketing)
  p = p.replace(/\/\([^)]+\)/g, "")

  // 4. Cleanup: collapse double slashes and trailing slashes
  p = p.replace(/\/+/g, "/")
  if (p.endsWith("/")) p = p.slice(0, -1)

  // 5. Default to root if empty
  if (p === "") return "/"

  // 6. Skip parameterized routes (handled manually)
  if (p.includes("[") || p.includes("]")) return null

  return p
}

function buildSitemapXml(
  urls: Array<{ loc: string; lastmod?: string }>,
): string {
  const items = urls
    .map(({ loc, lastmod }) => {
      const locXml = `<loc>${xmlEscape(loc)}</loc>`
      // Use lastmod if available, otherwise just URL
      const lastmodXml = lastmod
        ? `<lastmod>${xmlEscape(lastmod)}</lastmod>`
        : ""
      return `<url>${locXml}${lastmodXml}</url>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`
}

// Vite glob import to find all pages at build time
const _pageModules = import.meta.glob("/src/routes/**/+page.svelte")
const _pageRouteIds = Object.keys(_pageModules)

// Pre-calculate Article URLs
const _articleLastmodByPath = new Map<string, string>()
for (const article of articlesMeta) {
  _articleLastmodByPath.set(`/articles/${article.slug}`, article.publishedAt)
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const origin = resolveOrigin(url.origin)
    const urlSet = new Set<string>()

    // 1. Static Pages found in filesystem
    for (const routeId of _pageRouteIds) {
      const urlPath = routeIdToUrlPath(routeId)
      if (!urlPath) continue
      if (isExcluded(urlPath)) continue
      urlSet.add(urlPath)
    }

    // 2. Dynamic Articles (Template specific logic)
    for (const p of _articleLastmodByPath.keys()) {
      if (!isExcluded(p)) urlSet.add(p)
    }

    // 3. Build URL objects
    const urls = Array.from(urlSet)
      .sort()
      .map((p) => ({
        loc: `${origin}${p === "/" ? "" : p}`,
        lastmod: _articleLastmodByPath.get(p), // Insert publish date if it's an article
      }))

    const body = buildSitemapXml(urls)

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Cache for 15 mins in CDN, 15 mins in browser
        "Cache-Control":
          "public, max-age=900, s-maxage=900, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[sitemap] Failed to generate sitemap:", err)
    const message = dev
      ? `Failed to generate sitemap: ${(err as Error)?.message ?? "Unknown error"}`
      : "Failed to generate sitemap"
    return new Response(message, { status: 500 })
  }
}
