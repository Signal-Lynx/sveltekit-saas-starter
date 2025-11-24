// src/routes/api/[...filepath]/+server.ts (Updated for dynamic file handling)

import { redirect, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { env } from "$env/dynamic/private"
import { getUserSubscriptionState } from "$lib/server/subscription"

const s3 = new S3Client({
  region: env.PRIVATE_R2_REGION!,
  endpoint: env.PRIVATE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: env.PRIVATE_R2_ACCESS_KEY_ID!,
    secretAccessKey: env.PRIVATE_R2_SECRET_ACCESS_KEY!,
  },
})

// Maps the first path segment to the internal product ID (for entitlement check).
const PATH_TO_PROD_ID_MAP: Record<string, string> = {
  "signal-shield": "script",
  "lynx-relay": "engine",
  "key-commander": "license-hub",
}

// Beta Product ID → Production Product ID (for entitlement check).
const BETA_TO_PROD_ID_MAP: Record<string, string> = {
  SignalShield_Beta: "script",
  LynxRelay_Beta: "engine",
  KeyCommander_Beta: "license-hub",
}

/**
 * Derives the required product ID from the file path.
 * This function makes the download gate dynamic.
 * @param key The R2 object key (filepath).
 * @returns The required product ID or undefined if no mapping exists.
 */
function getRequiredProductIdFromPath(key: string): string | undefined {
  const parts = key.split("/")

  // Beta download logic: beta/downloads/SignalShield_Beta/...
  if (parts[0] === "beta" && parts[1] === "downloads" && parts[2]) {
    return BETA_TO_PROD_ID_MAP[parts[2]]
  }

  // Production download logic based on top-level folder: signal-shield/...
  if (parts[0]) {
    return PATH_TO_PROD_ID_MAP[parts[0]]
  }

  return undefined
}

export const GET: RequestHandler = async (event) => {
  const { params, locals } = event

  if (!locals.user) {
    throw redirect(303, "/login")
  }

  // The 'key' represents the full path to the object in the R2 bucket.
  const key = params.filepath.startsWith("download/")
    ? params.filepath.substring("download/".length)
    : params.filepath

  const requiredProductId = getRequiredProductIdFromPath(key)

  if (!requiredProductId) {
    console.warn(`[API GATE] No product mapping for key: ${key}`)
    return new Response("File not found or not protected.", { status: 404 })
  }

  const subscriptionState = await getUserSubscriptionState(locals.user, {
    clientIp: locals.clientIp,
    requestId: locals.requestId,
  })

  const isEntitled =
    subscriptionState.ownedProductIds.includes(requiredProductId)

  if (!isEntitled) {
    return new Response(
      "Access Denied: You do not have a license for this product.",
      { status: 403 },
    )
  }

  const command = new GetObjectCommand({
    Bucket: env.PRIVATE_R2_BUCKET_NAME!,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split("/").pop()}"`,
  })

  try {
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300, // Link is valid for 5 minutes
    })
    // This redirect must be thrown to be handled correctly by SvelteKit.
    throw redirect(303, signedUrl)
  } catch (err) {
    // If the error is a SvelteKit redirect, re-throw it.
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      "location" in err
    ) {
      throw err
    }
    console.error("[API GATE] Error generating signed URL:", err)
    // For other errors, throw a SvelteKit error to show the user a proper error page.
    throw error(500, "Could not process your download request.")
  }
}
