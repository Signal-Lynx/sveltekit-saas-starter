import type { PageServerLoad } from "./$types"
import { buildSearchIndex } from "$lib/build_index"

export const prerender = false

const ONE_HOUR_MS = 60 * 60 * 1000
const SERVER_TTL_MS = import.meta.env.DEV ? 0 : ONE_HOUR_MS

let cache: { builtAt: number; payload: any } | null = null
let inflight: Promise<any> | null = null

async function getPayload() {
  const now = Date.now()
  if (cache && SERVER_TTL_MS > 0 && now - cache.builtAt < SERVER_TTL_MS) {
    return cache.payload
  }
  if (inflight) return inflight

  inflight = (async () => {
    const payload = await buildSearchIndex()
    cache = { builtAt: Date.now(), payload }
    inflight = null
    return payload
  })().catch((e) => {
    inflight = null
    throw e
  })

  return inflight
}

export const load: PageServerLoad = async () => {
  return {
    searchPayload: await getPayload(),
  }
}
