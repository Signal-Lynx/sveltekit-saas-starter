// src/routes/(internal)/admin/customers/[id]/billing-portal/+server.ts
import type { RequestHandler } from "./$types"
import { redirect } from "@sveltejs/kit"
import { openBillingPortalForUser } from "$lib/server/admin/customers"
import { audit } from "$lib/server/admin/audit"

function requireActorId(locals: App.Locals): string {
  const id = locals?.user?.id
  if (!id) throw redirect(303, "/login")
  return id
}

function ensureUserId(id: string | undefined): string {
  if (!id) throw redirect(303, "/login")
  return String(id).trim()
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
  const actorId = requireActorId(locals as App.Locals)
  const userId = ensureUserId(params.id)

  console.info("[admin.billing-portal] GET hit", { userId })

  const returnUrl = new URL(`/admin/customers/${userId}`, url).toString()

  // 1) Only catch failures from session creation
  let portalUrl: string
  try {
    portalUrl = await openBillingPortalForUser(userId, returnUrl)
  } catch (e: any) {
    // If a SvelteKit redirect bubbles up here for any reason, rethrow it
    if (e && typeof e === "object" && "status" in e && "location" in e) {
      throw e as any
    }
    console.warn("[admin.billing-portal] portal creation failed", {
      userId,
      type: e?.type,
      code: e?.code,
      message: typeof e?.message === "string" ? e.message : JSON.stringify(e),
    })
    throw redirect(
      303,
      `/admin/customers/${encodeURIComponent(userId)}?error=stripe_customer_missing`,
    )
  }

  // 2) Best-effort audit (don’t block redirect)
  try {
    await audit(actorId, "open_billing_portal", userId, {})
  } catch (e) {
    console.warn("[admin.billing-portal] audit failed (non-blocking)", {
      userId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  // 3) Success: perform the real redirect OUTSIDE any try/catch
  console.info("[admin.billing-portal] redirect → portal", { userId })
  throw redirect(303, portalUrl)
}
