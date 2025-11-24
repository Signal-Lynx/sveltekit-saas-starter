// src/lib/server/supabaseAdmin.ts
import { env } from "$env/dynamic/private"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Create (or reuse) a server-side Supabase admin client.
 * - Validates required env vars early with clear messages.
 * - Disables session persistence/auto-refresh (not needed for service-role).
 * - Uses a dev-friendly singleton to avoid multiple clients during HMR.
 * - Does NOT change inputs/outputs: still exports `supabaseAdmin` as a Supabase client.
 *
 * If you have generated database types, you can optionally add:
 *   import type { Database } from "$lib/types/supabase"
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

const SUPABASE_URL = requireEnv(
  "PRIVATE_SUPABASE_URL",
  env.PRIVATE_SUPABASE_URL,
)
const SUPABASE_SERVICE_ROLE = requireEnv(
  "PRIVATE_SUPABASE_SERVICE_ROLE",
  env.PRIVATE_SUPABASE_SERVICE_ROLE,
)

// ---- HMR-safe singleton (dev) ---------------------------------------------
declare global {
  var __supabaseAdmin__: SupabaseClient | undefined
}

function makeClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
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

export const supabaseAdmin: SupabaseClient =
  globalThis.__supabaseAdmin__ ?? makeClient()

// Cache the instance on globalThis to avoid multiple clients in dev HMR.
globalThis.__supabaseAdmin__ = supabaseAdmin
