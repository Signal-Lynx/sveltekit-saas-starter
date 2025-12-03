// src/routes/api/admin/stripe-pulse/+server.ts
import { json, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { getStripePulseSummaryCached } from "$lib/server/admin/stripe_pulse"
import { supabaseAdmin } from "$lib/server/supabaseAdmin"

export const GET: RequestHandler = async ({ locals }) => {
  // 1. Ensure user is logged in
  if (!locals.user) {
    throw error(401, "Unauthorized")
  }

  // 2. Ensure user is an admin via the service role
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", locals.user.id)
    .single()

  if (!profile?.is_admin) {
    throw error(403, "Forbidden")
  }

  // 3. Return data
  // small TTL cache inside the module to keep this snappy on refreshes
  const data = await getStripePulseSummaryCached(60) // 60s
  return json(data, {
    headers: {
      // let browsers avoid re-fetching for a minute
      "Cache-Control": "private, max-age=60",
    },
  })
}
