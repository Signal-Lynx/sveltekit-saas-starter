// src/routes/.well-known/security.txt/+server.ts
import type { RequestHandler } from "@sveltejs/kit"
import { WebsiteBaseUrl, SITE_CONFIG } from "../../../config"

export const prerender = false

export const GET: RequestHandler = async () => {
  // Dynamically generate an expiration date for one year from now.
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  const expiresISO = expires.toISOString()

  // Build the security.txt content using values from your config.ts file.
  const content = [
    `Contact: mailto:${SITE_CONFIG.securityEmail}`,
    `Contact: ${WebsiteBaseUrl}/contact_us`, // Using contact_us as the support link
    `Policy: ${WebsiteBaseUrl}/security`,
    `Acknowledgments: ${WebsiteBaseUrl}/security#hall-of-fame`,
    `Preferred-Languages: en`,
    `Canonical: ${WebsiteBaseUrl}/.well-known/security.txt`,
    `Expires: ${expiresISO}`,
  ].join("\n")

  // Return the content as a plain text response.
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cache this file for 24 hours, as it only changes on deployment.
      "Cache-Control": "public, max-age=86400",
    },
  })
}
