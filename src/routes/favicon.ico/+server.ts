// src/routes/favicon.ico/+server.ts
import { redirect } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

/**
 * Redirects legacy /favicon.ico requests to the modern /favicon.png asset.
 * This resolves persistent 404 errors in browser logs that occur when a browser
 * or extension attempts to fetch the default ICO location.
 */
export const GET: RequestHandler = async () => {
  // Use 301 Moved Permanently for permanent asset relocation
  throw redirect(301, "/favicon.png")
}
