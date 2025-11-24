// src/routes/api/admin/stripe-pulse/+server.ts
import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { getStripePulseSummaryCached } from "$lib/server/admin/stripe_pulse"

export const GET: RequestHandler = async () => {
  // small TTL cache inside the module to keep this snappy on refreshes
  const data = await getStripePulseSummaryCached(60) // 60s
  return json(data, {
    headers: {
      // let browsers avoid re-fetching for a minute
      "Cache-Control": "private, max-age=60",
    },
  })
}
