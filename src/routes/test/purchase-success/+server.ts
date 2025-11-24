// src/routes/test/purchase-success/+server.ts
import { dev } from "$app/environment"
import { redirect, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const prerender = false

// Keep paths centralized to avoid drift if routes are ever reorganized
const LOGIN_ROUTE = "/login"
const SUCCESS_ROUTE = "/account/purchase-success"

export const GET: RequestHandler = async ({ locals, url }) => {
  // Only available in development
  if (!dev) throw error(404, "Not Found")

  // Require auth; if missing, bounce to login with return path
  const user = locals?.user ?? null
  if (!user) {
    const next = encodeURIComponent(url.pathname) // e.g., "/test/purchase-success"
    throw redirect(303, `${LOGIN_ROUTE}?next=${next}`)
  }

  // Authenticated devs go to the purchase success page
  throw redirect(303, SUCCESS_ROUTE)
}
