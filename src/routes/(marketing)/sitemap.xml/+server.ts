// src/routes/(marketing)/sitemap.xml/+server.ts
import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"
import { dev } from "$app/environment"

export const prerender = false

/**
 * Normalize and validate the sitemap origin.
 * - Prefer WebsiteBaseUrl from config
 * - Fallback to runtime request origin if config is missing/invalid
 * - Strip trailing slash for consistency (super-sitemap handles paths)
 */
function resolveOrigin(fallbackOrigin: string): string {
  const candidate = (WebsiteBaseUrl ?? "").trim()
  try {
    const u = new URL(candidate || fallbackOrigin)
    // Remove trailing slash (except for bare domain '/')
    const normalized =
      u.origin.endsWith("/") && u.pathname === ""
        ? u.origin.slice(0, -1)
        : u.origin
    return normalized
  } catch {
    // Last-ditch: use the fallback (always a valid absolute origin from event.url)
    return fallbackOrigin
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const origin = resolveOrigin(url.origin)

    // Generate the sitemap using the same config as before (no output changes).
    const res = await sitemap.response({
      origin,
      excludeRoutePatterns: [
        ".*\\(internal\\).*", // Exclude routes within the (internal) group
        "^/blog.*", // Keep excluded now; easy to enable later
      ],
    })

    // Clone response to add robust caching & explicit content type
    // WITHOUT changing the XML body.
    const headers = new Headers(res.headers)
    // Cache for 15 minutes in browsers/CDNs; allow quick SWR.
    headers.set(
      "Cache-Control",
      "public, max-age=900, s-maxage=900, stale-while-revalidate=60",
    )
    // Ensure correct content type (super-sitemap sets it, but make it explicit)
    headers.set("Content-Type", "application/xml; charset=utf-8")

    return new Response(res.body, {
      status: res.status,
      headers,
    })
  } catch (err) {
    const message = dev
      ? `Failed to generate sitemap: ${(err as Error)?.message ?? "Unknown error"}`
      : "Failed to generate sitemap"
    return new Response(message, { status: 500 })
  }
}
