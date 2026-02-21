// FILE: src/hooks.server.ts (Template File - COMPLETE REPLACEMENT)
import { env } from "$env/dynamic/private"
import { env as publicEnv } from "$env/dynamic/public"
import { building, dev } from "$app/environment"
import { createServerClient } from "@supabase/ssr"
import type { Handle, HandleServerError } from "@sveltejs/kit"
import type { CookieSerializeOptions } from "cookie"
import { sequence } from "@sveltejs/kit/hooks"
import { withContext } from "$lib/server/logger"
import type { Database } from "$lib/types/database"
import { reportWebsiteError } from "$lib/server/errorApi"
import { redirect, error } from "@sveltejs/kit"

// --- DYNAMIC DOMAIN CONFIGURATION -----------------------------------
// Automatically derives 'admin.' and root domains from your PUBLIC_WEBSITE_BASE_URL
// Example: If base URL is "https://www.signallynx.com"
// MAIN_HOST = "www.signallynx.com"
// ADMIN_HOST = "admin.signallynx.com"
// ROOT_DOMAIN_COOKIE = ".signallynx.com"

const getDomainConfig = () => {
  const baseUrl = publicEnv.PUBLIC_WEBSITE_BASE_URL || "http://localhost:5173"

  let hostname = "localhost"
  try {
    hostname = new URL(baseUrl).hostname
  } catch {
    // Fallback if env var is malformed
  }

  // Strip 'www.' to get the root domain
  const rootDomain = hostname.startsWith("www.") ? hostname.slice(4) : hostname

  return {
    MAIN_HOST: hostname,
    ADMIN_HOST: `admin.${rootDomain}`,
    ROOT_DOMAIN_COOKIE: `.${rootDomain}`,
  }
}

const { MAIN_HOST, ADMIN_HOST, ROOT_DOMAIN_COOKIE } = getDomainConfig()

const ROOT_DOMAIN = ROOT_DOMAIN_COOKIE.startsWith(".")
  ? ROOT_DOMAIN_COOKIE.slice(1)
  : ROOT_DOMAIN_COOKIE
// --------------------------------------------------------------------

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

// Junk Filter to stop bots early ---
function isJunkRequest(pathname: string): boolean {
  const lower = pathname.toLowerCase()

  // 1. SAFETY ALLOW LIST: Never block these, no matter what
  if (
    pathname === "/" ||
    pathname === "/access" ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/favicon-48.png" ||
    pathname === "/favicon-192.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/flutter_service_worker.js" || // Keep this to quiet 404s
    lower.startsWith("/_app") || // SvelteKit assets
    lower.startsWith("/api/") || // Your APIs (Stripe, Downloads)
    lower.startsWith("/test") // Test routes
  ) {
    return false
  }

  // 2. BLOCK LIST: File extensions you definitely don't serve
  if (
    /\.(php|sql|bak|rar|zip|asp|aspx|jsp|cgi|env|git|ini|config|log)$/i.test(
      lower,
    )
  ) {
    return true
  }

  // 3. BLOCK LIST: Specific patterns found in your logs
  const junkPatterns = [
    // WordPress & CMS probes
    "/wp-",
    "/wp/",
    "/wordpress",
    "xmlrpc",
    "cgi-bin",
    "phpmyadmin",
    "/phpinfo",

    // Specific exploits seen in your logs
    "alfa_data", // Bot probe
    "fckeditor", // Text editor exploit
    "phpunit", // PHP unit testing exploit
    "mod_simplefileupload", // Joomla exploit

    // Generic reconnaissance
    "/old/",
    "/backup/",
    "/install/",
    "/temp/",
    ".well-knownold", // Bot typo seen in logs
    "manifest.json",

    // Potentially dangerous admin probes
    // (Note: We rely on start/end slashes to avoid blocking valid words)
    "/admin/uploads",
    "/admin/images",
    "/sites/default/files",
    "/components/",
    "/modules/",
    "/vendor/",
  ]

  return junkPatterns.some((pattern) => lower.includes(pattern))
}

const junkFilter: Handle = async ({ event, resolve }) => {
  if (isJunkRequest(event.url.pathname)) {
    // Return 404 immediately. No logs, no DB, no redirect.
    return new Response("Not Found", { status: 404 })
  }
  return resolve(event)
}

// -------------------------------
// Admin Domain Guard (The Split)
// -------------------------------
const adminDomainGuard: Handle = async ({ event, resolve }) => {
  // Skip logic if:
  // 1. Dev mode
  // 2. Building
  // 3. Vercel Preview URLs (ends with .vercel.app)
  if (dev || building || event.url.hostname.endsWith(".vercel.app")) {
    return resolve(event)
  }

  const path = event.url.pathname
  const host = event.url.hostname

  // CRITICAL: Never redirect .well-known paths.
  // This ensures Vercel's SSL bot stays on the correct host to verify certificates.
  if (path.startsWith("/.well-known/")) {
    return resolve(event)
  }

  // Treat BOTH the admin UI AND admin API routes as "admin traffic"
  const isAdminTraffic =
    path.startsWith("/admin") || path.startsWith("/api/admin")

  // 1. Force admin traffic onto the protected admin subdomain
  if (isAdminTraffic && host !== ADMIN_HOST) {
    const url = new URL(event.url)
    url.hostname = ADMIN_HOST
    url.protocol = "https:"
    throw redirect(308, url.toString())
  }

  // Login/auth plumbing is permitted on the admin host.
  // This avoids an unnecessary bounce to www during auth flows.
  const isAuthFlowPath =
    path.startsWith("/login") || path.startsWith("/auth/") || path === "/access"

  // 2. Force non-admin traffic OFF the admin subdomain
  // Exception: auth flow paths may stay on admin host.
  if (!isAdminTraffic && !isAuthFlowPath && host === ADMIN_HOST) {
    const url = new URL(event.url)
    url.hostname = MAIN_HOST
    url.protocol = "https:"
    throw redirect(308, url.toString())
  }

  return resolve(event)
}

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

  // Allow unsafe-eval on the main site (GTM often needs it),
  // but keep admin strict.
  const host = event.url.hostname
  const allowUnsafeEval = isDev || host !== ADMIN_HOST

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
    ...(allowUnsafeEval ? ["'unsafe-eval'"] : []),
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
        setAll: (
          cookiesToSet: Array<{
            name: string
            value: string
            options: CookieSerializeOptions
          }>,
        ) => {
          const host = event.url.hostname
          const sharedDomain =
            !dev &&
            !building &&
            !host.endsWith(".vercel.app") &&
            (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`))
              ? ROOT_DOMAIN_COOKIE
              : undefined

          cookiesToSet.forEach(({ name, value, options }) => {
            // Hygiene: clear existing cookies to avoid duplicate-cookie ambiguity.
            // 1) Clear host-only cookie on the current host
            event.cookies.delete(name, { path: "/" })

            // 2) Clear shared-domain cookie (if we’re using shared-domain mode)
            if (sharedDomain) {
              event.cookies.delete(name, { path: "/", domain: sharedDomain })
            }

            // Set cookie (shared across subdomains in prod)
            event.cookies.set(name, value, {
              ...options,
              path: "/",
              ...(sharedDomain ? { domain: sharedDomain } : {}),
            })
          })
        },
      },
      global: {
        fetch: (
          input: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ) => {
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
      const host = event.url.hostname
      const sharedDomain =
        !dev &&
        !building &&
        !host.endsWith(".vercel.app") &&
        (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`))
          ? ROOT_DOMAIN_COOKIE
          : undefined

      for (const c of event.cookies.getAll()) {
        if (c.name.startsWith("sb-")) {
          // host-only
          event.cookies.delete(c.name, { path: "/" })

          // shared-domain
          if (sharedDomain) {
            event.cookies.delete(c.name, { path: "/", domain: sharedDomain })
          }
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

// -------------------------------
// 5b) Cloudflare Access metadata (optional, defense-in-depth)
// -------------------------------
const cloudflareAccessMeta: Handle = async ({ event, resolve }) => {
  const headers = event.request.headers

  // Primary email header for Cloudflare Access, with a couple of fallbacks.
  const email =
    headers.get("cf-access-authenticated-user-email") ??
    headers.get("cf-access-authenticated-user") ??
    null

  // Access JWT – presence indicates the request passed through Cloudflare Access.
  const jwt =
    headers.get("cf-access-jwt-assertion") ??
    headers.get("cf_authorization") ??
    null

  event.locals.cfAccess = {
    email,
    hasJwt: !!jwt,
  }

  // Treat both UI and API admin routes as requiring protection
  const isAdminPath =
    event.url.pathname.startsWith("/admin") ||
    event.url.pathname.startsWith("/api/admin")

  // Remove env var check - security is mandatory in production
  const isProd = !dev && !building

  // Check if we are actually on the admin host
  const isAdminHost = event.url.hostname === ADMIN_HOST

  // Fail closed: If Prod + Admin Host + Admin Path + No Token = BLOCK
  if (isProd && isAdminHost && isAdminPath && !jwt) {
    console.warn("[cf-access] Missing Access token on admin route", {
      path: event.url.pathname,
      clientIp: event.locals.clientIp,
      host: event.url.hostname,
    })
    return new Response("Not Found", { status: 404 })
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

    // 1. Auth endpoints
    if (pathname === "/access" || pathname === "/login/sign_in") {
      if (!isAllowed(`auth:${key}`, 10, 60_000)) {
        return actionFailure(429, {
          errorMessage: "Too many attempts. Please try again in a minute.",
        })
      }
    }

    // 2. Public forms (Contact Us & Error Reporting) - NEW
    if (pathname === "/contact_us" || pathname === "/api/report-error") {
      // Limit to 5 requests per minute per IP
      if (!isAllowed(`pub:${key}`, 5, 60_000)) {
        return actionFailure(429, {
          errorMessage: "Too many requests. Please wait a minute.",
        })
      }
    }

    // 3. Authenticated Account Area
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

  // Allow access page, authenticated users, and static assets
  if (
    pathname === "/access" ||
    hasCookie ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/favicon-48.png" ||
    pathname === "/favicon-192.png" ||
    pathname === "/robots.txt"
  ) {
    return resolve(event)
  }

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
  const status = svelteKitError?.status ?? 500

  // Ignore ALL 404 errors (Page Not Found).
  // These are usually bots, stale tabs, or bad URLs — not application bugs.
  // This implicitly covers flutter_service_worker.js and any other missing file.
  if (status === 404) {
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
  junkFilter,
  adminDomainGuard,
  requestContext,
  captureClientIp,
  cloudflareAccessMeta, // enrich + (optionally) enforce Cloudflare Access for /admin
  siteGate,
  securityHeaders,
  supabase,
  csrfGuard,
  rateLimit,
)
