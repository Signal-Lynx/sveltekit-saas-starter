// src/lib/server/supabaseAdmin.ts
import * as env from "$app/env/private"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Create (or reuse) a server-side Supabase admin client.
 * - Validates required env vars early with clear messages.
 * - Disables session persistence/auto-refresh (not needed for service-role).
 * - Uses a dev-friendly singleton to avoid multiple clients during HMR.
 * - Does NOT change inputs/outputs: still exports `supabaseAdmin` as a Supabase client.
 *
 * If you have generated database types, you can optionally add:
 *   import type { Database } from "#lib/types/database.ts"
 * and change the SupabaseClient generic below to SupabaseClient<Database>.
 */

// ---- Helpers ---------------------------------------------------------------

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    // Throwing here fails-fast in misconfig, preventing confusing runtime errors
    throw new Error(
      `[supabaseAdmin] Missing required environment variable: ${name}. ` +
        `Set ${name} in your server environment (.env) before starting the app.`,
    )
  }
  return value
}

// ---- HMR-safe singleton (dev) ---------------------------------------------
declare global {
  var __supabaseAdmin__: SupabaseClient | undefined
}

function makeClient(): SupabaseClient {
  const url = requireEnv("PRIVATE_SUPABASE_URL", env.PRIVATE_SUPABASE_URL)
  const role = requireEnv(
    "PRIVATE_SUPABASE_SERVICE_ROLE",
    env.PRIVATE_SUPABASE_SERVICE_ROLE,
  )
  return createClient(url, role, {
    auth: {
      // Service role keys should never maintain a browser-like session.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      // Keep default schema explicit; change here only if your project differs.
      schema: "public",
    },
    global: {
      // Small identifier to help trace requests on the Supabase side.
      headers: { "X-Client-Info": "supabase-admin-server" },
      // You can provide a custom fetch here if you need timeouts/instrumentation.
      // fetch: (input, init) => fetch(input, init),
    },
  })
}

function getClient(): SupabaseClient {
  // Cache the real instance on globalThis to avoid repeated clients in dev HMR.
  return (globalThis.__supabaseAdmin__ ??= makeClient())
}

// Importing this module must not require credentials while SvelteKit analyses
// routes. A real DB operation still validates credentials and fails clearly.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
