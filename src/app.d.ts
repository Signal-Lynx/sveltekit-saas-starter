// src/app.d.ts

// Use type-only imports to avoid any unintended runtime side effects in a .d.ts file.
import type { Session, AMREntry } from "@supabase/supabase-js"
import type { Database } from "$lib/types/database"

/** Minimal, stable shape for authenticated users exposed to the app. */
type AppUser = {
  readonly id: string
  readonly email: string | undefined
}

/** Return type for `locals.safeGetSession()`. */
type SafeSession = {
  readonly session: Session | null
  readonly user: AppUser | null
  readonly amr: ReadonlyArray<AMREntry> | null
}

/**
 * Exact server client type for @supabase/ssr
 * (keeps us in lockstep with whatever the helper returns).
 */
type SupabaseServerClient = ReturnType<
  typeof import("@supabase/ssr").createServerClient<Database>
>

declare global {
  namespace App {
    /** Lightweight logger interface used across the app. */
    type AppLogger = {
      debug: (msg: string, fields?: Record<string, unknown>) => void
      info: (msg: string, fields?: Record<string, unknown>) => void
      warn: (msg: string, fields?: Record<string, unknown>) => void
      error: (msg: string, fields?: Record<string, unknown>) => void
    }

    /**
     * Values placed on `event.locals` (see `hooks.server.ts`).
     * Keep these serializable where possible and stable across requests.
     */
    interface Locals {
      supabase: SupabaseServerClient
      safeGetSession: () => Promise<SafeSession>
      session: Session | null
      user: AppUser | null
      requestId: string
      clientIp: string
      log: AppLogger
    }

    /** Data returned from `+layout.server.ts`. */
    interface PageData {
      siteGateActive: boolean
      siteAccessGranted: boolean

      /** @deprecated Use `auth` instead. Will be removed after migration. */
      session: Session | null

      auth:
        | { signedIn: false }
        | { signedIn: true; userId: string; email: string | null }
    }

    // interface Error {}
    // interface Platform {}
  }
}

export {}
