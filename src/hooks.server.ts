// FILE: src/hooks.server.ts (COMPLETE REPLACEMENT)
import { env } from "$env/dynamic/private"
import { building, dev } from "$app/environment"
import { createServerClient } from "@supabase/ssr"
import type { Handle, HandleServerError } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { withContext } from "$lib/server/logger"
import type { Database } from "$lib/types/database"
import { reportWebsiteError } from "$lib/server/errorApi"
import { redirect, error } from "@sveltejs/kit"

// ERROR TEST FUNCTION
const forceErrorForTest: Handle = async ({ event, resolve }) => {
  // If we visit /test-error, this will throw a 500 error immediately.
  if (event.url.pathname === "/test-error") {
    throw error(500, { message: "FORCED_TEST_ERROR_FROM_HOOKS" })
  }
  // For all other pages, it does nothing.
  return resolve(event)
}

// -------------------------------
// 0) Small utilities
// -------------------------------
function jsonSafe(data: unknown): string {
  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

function safeOrigin(maybeUrl: string | undefined | null): string {
  if (!maybeUrl) return ""
  try {
    const u = new URL(maybeUrl)
    if (u.protocol === "http:" || u.protocol === "https:") return u.origin
    return ""
  } catch {
    return ""
  }
}

function actionFailure(
  status: number,
  data: Record<string, unknown>,
): Response {
  return new Response(jsonSafe({ type: "failure", status, data }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-sveltekit-action": "true",
    },
  })
}

// -------------------------------
// Module-scope guards for CSP logging (added)
// -------------------------------
let __cspLoggedOnce = false
let __lastCsp = ""

// -------------------------------
// 1) Per-request correlation + structured logging
// -------------------------------
const requestContext: Handle = async ({ event, resolve }) => {
  const requestId = crypto.randomUUID()
  const started = Date.now()
  const ctx = {
    requestId,
    path: event.url.pathname,
    method: event.request.method,
  }

  event.locals.requestId = requestId
  event.locals.log = withContext(ctx)

  const res = await resolve(event)
  res.headers.set("X-Request-ID", requestId)

  // Quiet default logging; only log slow or non-2xx, plus light sampling
  const ms = Date.now() - started
  const isGood = res.status < 400 // 2xx and 3xx are “good”
  const parsedSlow = Number(env.PRIVATE_SLOW_REQ_MS)
  const slowThreshold =
    Number.isFinite(parsedSlow) && parsedSlow > 0 ? parsedSlow : 500
  const parsedSample = Number(env.PRIVATE_REQ_SAMPLE_N)
  const sampleN =
    Number.isFinite(parsedSample) && parsedSample > 0 ? parsedSample : 20
  const sampled = Math.floor(Math.random() * sampleN) === 0

  if (!isGood || ms > slowThreshold || sampled) {
    event.locals.log.info("request.complete", { status: res.status, ms })
  }

  return res
}

// -------------------------------
// 2) Security Headers / CSP
// -------------------------------
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  if (event.url.pathname.startsWith("/account")) {
    response.headers.set("Cache-Control", "no-store, private")
  }

  const isDev = dev

  const supabaseOrigin = safeOrigin(env.PRIVATE_SUPABASE_URL!)
  const lmOrigin = safeOrigin(env.PRIVATE_LICENSE_MANAGER_URL!)

  const scriptSrc = [
    "'self'",
    "https://www.googletagmanager.com",
    "https://js.stripe.com",
    "https://challenges.cloudflare.com",
    // Allow the SvelteKit inline boot script + our Turnstile onMount logic to run.
    // This is required for hydration in production.
    "'unsafe-inline'",
    // Allow Wasm compilation without enabling general eval; helps quiet Turnstile warnings.
    "'wasm-unsafe-eval'",
    // Keep 'unsafe-eval' dev-only so we don’t weaken prod more than necessary.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ]

  const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]

  const connectSrc = [
    "'self'",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://api.stripe.com",
    "https://challenges.cloudflare.com",
    supabaseOrigin,
    lmOrigin,
    ...(isDev
      ? [
          "ws://localhost:5173",
          "ws://127.0.0.1:5173",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]
      : []),
  ].filter(Boolean) as string[]

  const imgSrc = ["'self'", "data:", ...(isDev ? ["blob:"] : [])]

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${imgSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]

  const csp = cspDirectives.join("; ")

  // Log CSP once per boot or when it changes; optional verbose via env
  if (isDev && event.url.pathname !== "/flutter_service_worker.js") {
    const debugCsp = env.PRIVATE_DEBUG_CSP === "1"
    if (debugCsp || !__cspLoggedOnce || __lastCsp !== csp) {
      console.log("[CSP]", debugCsp ? "(debug)" : "(once)", csp)
      __cspLoggedOnce = true
      __lastCsp = csp
    }
  }

  response.headers.set("Content-Security-Policy", csp)

  if (!isDev && event.url.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    )
  }

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Cross-Origin-Resource-Policy", "same-site")
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  )

  return response
}

// -------------------------------
// 3) Supabase (authoritative user via getUser, no eager session)
// -------------------------------
const supabase: Handle = async ({ event, resolve }) => {
  // Quiet auth pre-log unless explicitly enabled
  if (
    dev &&
    env.PRIVATE_DEBUG_AUTH === "1" &&
    event.url.pathname !== "/flutter_service_worker.js"
  ) {
    const names = event.cookies.getAll().map((c) => c.name)
    const supaCookies = names.filter((n) => /sb-|supabase|auth/i.test(n))
    console.debug("[auth:pre]", {
      path: event.url.pathname,
      supabaseCookieNames: supaCookies,
      count: supaCookies.length,
    })
  }

  // IMPORTANT: this uses the SSR cookie API for your installed @supabase/ssr version (getAll/setAll)
  event.locals.supabase = createServerClient<Database>(
    env.PRIVATE_SUPABASE_URL!,
    env.PRIVATE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // SvelteKit requires path to be set explicitly
            event.cookies.set(name, value, { ...(options ?? {}), path: "/" })
          })
        },
      },
      global: {
        fetch: (input, init) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000) // 4-second timeout for Supabase calls

          return fetch(input, {
            ...init,
            signal: controller.signal,
          }).finally(() => {
            clearTimeout(timeoutId)
          })
        },
      },
    },
  )

  let supaUser: { id: string; email: string } | null = null

  try {
    const { data, error: supaErr } = await event.locals.supabase.auth.getUser()

    if (
      supaErr &&
      (supaErr as { code?: string }).code === "refresh_token_not_found"
    ) {
      for (const c of event.cookies.getAll()) {
        if (c.name.startsWith("sb-")) {
          event.cookies.delete(c.name, { path: "/" })
        }
      }
    }

    const rawUser = data?.user
    if (rawUser?.email) {
      supaUser = { id: rawUser.id, email: rawUser.email }
    }
  } catch (err) {
    console.warn("[auth:getUser] suppressed error", err)
  }

  // Quiet auth logs unless explicitly enabled
  if (
    dev &&
    env.PRIVATE_DEBUG_AUTH === "1" &&
    event.url.pathname !== "/flutter_service_worker.js"
  ) {
    console.debug("[auth:getUser]", {
      path: event.url.pathname,
      userId: supaUser?.id ?? null,
      hasEmail: !!supaUser?.email,
    })
  }

  event.locals.user = supaUser
  event.locals.session = null

  if (
    dev &&
    env.PRIVATE_DEBUG_AUTH === "1" &&
    event.url.pathname !== "/flutter_service_worker.js"
  ) {
    console.debug("[auth]", {
      path: event.url.pathname,
      hasUser: !!event.locals.user,
      hasSession: !!event.locals.session,
    })
  }

  event.locals.safeGetSession = async () => {
    try {
      const { data } = await event.locals.supabase.auth.getUser()
      const u = data?.user?.email
        ? { id: data.user.id, email: data.user.email }
        : null
      const { data: aal } =
        await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      return {
        session: null,
        user: u,
        amr: aal?.currentAuthenticationMethods ?? null,
      }
    } catch {
      return { session: null, user: null, amr: null }
    }
  }

  return resolve(event, {
    // Keep Supabase's required header passthroughs
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version"
    },
  })
}

// -------------------------------
// 4) CSRF Protection (scoped to /account)
// -------------------------------
const csrfGuard: Handle = async ({ event, resolve }) => {
  if (
    event.request.method !== "GET" &&
    event.request.method !== "OPTIONS" &&
    event.url.pathname.startsWith("/account")
  ) {
    const origin = event.request.headers.get("origin")
    if (!origin || origin !== event.url.origin) {
      return new Response("Cross-site request forgery detected.", {
        status: 403,
      })
    }
  }
  return resolve(event)
}

// -------------------------------
// 5) Rate Limiter (in-memory, dev-friendly)
// -------------------------------
const captureClientIp: Handle = async ({ event, resolve }) => {
  try {
    event.locals.clientIp = event.getClientAddress()
  } catch {
    event.locals.clientIp = "0.0.0.0"
  }
  return resolve(event)
}

const rlBuckets = new Map<string, number[]>()

function isAllowed(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = rlBuckets.get(key) ?? []
  const inWindow = timestamps.filter((ts) => now - ts < windowMs)
  if (inWindow.length >= limit) {
    rlBuckets.set(key, inWindow)
    return false
  }
  inWindow.push(now)
  rlBuckets.set(key, inWindow)
  return true
}

const rateLimit: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const method = event.request.method

  if (building) return resolve(event)
  if (pathname === "/api/stripe/app-events" && method === "POST") {
    return resolve(event)
  }

  const ip = event.locals.clientIp || "0.0.0.0"

  if (method === "POST") {
    const key = `ip:${ip}`

    if (pathname === "/access" || pathname === "/login/sign_in") {
      if (!isAllowed(`auth:${key}`, 10, 60_000)) {
        return actionFailure(429, {
          errorMessage: "Too many attempts. Please try again in a minute.",
        })
      }
    }

    if (pathname.startsWith("/account")) {
      const userKey = event.locals.user?.id ?? key
      if (!isAllowed(`acct:${userKey}`, 5, 60_000)) {
        return actionFailure(429, {
          errorMessage: "Rate limit exceeded. Please slow down.",
        })
      }
    }
  } else if (method === "GET" && pathname.startsWith("/account")) {
    const navKey = event.locals.user?.id ?? `ip:${ip}`
    if (!isAllowed(`acct:get:${navKey}`, 120, 60_000)) {
      return new Response("Too many requests. Please slow down.", {
        status: 429,
      })
    }
  }

  return resolve(event)
}

// -------------------------------
// 6) Site Gate
// -------------------------------
const siteGate: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event)
  if (!env.PRIVATE_SITE_ACCESS_PASSWORD) return resolve(event)

  const { pathname, search } = event.url
  const hasCookie = event.cookies.get("site_access_granted") === "true"

  // Optional verbose site-gate logging; off by default
  if (
    dev &&
    env.PRIVATE_DEBUG_SITE === "1" &&
    pathname !== "/flutter_service_worker.js"
  ) {
    console.debug("[siteGate]", { pathname, hasCookie })
  }

  if (pathname === "/access" || hasCookie) return resolve(event)

  const nextTarget = pathname + (search || "")
  const redirectTo = `/access?gate=site&next=${encodeURIComponent(nextTarget)}`

  // Log only on actual redirect
  console.info("[siteGate] redirect", { to: redirectTo })
  throw redirect(303, redirectTo)
}

// -------------------------------
// 7) Global error handler (nice UX + room for Sentry later)
// -------------------------------
export const handleError: HandleServerError = async ({ error, event }) => {
  const svelteKitError = error as { status?: number; message?: string }

  // Normalize the message so we can reliably match it
  const message = String(svelteKitError.message || "")

  // Special case: the noisy flutter_service_worker.js 404
  const isIgnoredError =
    svelteKitError?.status === 404 &&
    message.includes("flutter_service_worker.js")

  if (isIgnoredError) {
    // fully silent: we don't even log in dev now
    return {
      message: "Not Found",
      errorId: null,
    }
  }

  // All OTHER errors still get reported + logged
  reportWebsiteError(error, event.locals.user)

  console.error("[handleError]", {
    path: event.url.pathname,
    userId: event.locals.user?.id,
    error,
  })

  const errorId = crypto.randomUUID()
  const errorMessage =
    "An unexpected error occurred. Our team has been notified."

  return {
    message: `${errorMessage} (Error ID: ${errorId})`,
    errorId,
  }
}

// -------------------------------
// 8) Export the pipeline (order preserved)
// -------------------------------
export const handle: Handle = sequence(
  forceErrorForTest,
  requestContext,
  captureClientIp,
  siteGate,
  securityHeaders,
  supabase,
  csrfGuard,
  rateLimit,
)
