// src/lib/server/license-api.ts
import { env } from "$env/dynamic/private"

/**
 * Attach Cloudflare Access service token headers if env vars are present.
 * Mutates and returns headers. No-op if vars unset (safe to deploy before enabling Access).
 */
export function appendCfAccessHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const clientId = (env.PRIVATE_CF_ACCESS_CLIENT_ID ?? "").trim()
  const clientSecret = (env.PRIVATE_CF_ACCESS_CLIENT_SECRET ?? "").trim()

  if (!clientId || !clientSecret) return headers

  if (!headers["CF-Access-Client-Id"]) headers["CF-Access-Client-Id"] = clientId
  if (!headers["CF-Access-Client-Secret"])
    headers["CF-Access-Client-Secret"] = clientSecret

  return headers
}
