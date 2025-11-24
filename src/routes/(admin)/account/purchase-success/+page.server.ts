import type { PageServerLoad } from "./$types"
import { dev } from "$app/environment"

const COOKIE_NAME = "lm_claim_check" as const

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
  // Prevent caching of this success page so the cookie state isn't stale.
  setHeaders({ "Cache-Control": "no-store" })

  // After a successful purchase, clear the claim-check cookie.
  // This ensures that on the next navigation to an /account page,
  // the system will perform a fresh check with the License Manager
  // to claim any newly purchased licenses.
  const hadCookie = cookies.get(COOKIE_NAME) !== undefined
  if (hadCookie) {
    cookies.delete(COOKIE_NAME, { path: "/" })
    if (dev) {
      console.log(
        `[Purchase Success] Cleared ${COOKIE_NAME} cookie to trigger license re-sync.`,
      )
    }
  } else if (dev) {
    console.log(
      `[Purchase Success] No ${COOKIE_NAME} cookie present; nothing to clear.`,
    )
  }

  // This page doesn't need to return any specific data.
  return {}
}
