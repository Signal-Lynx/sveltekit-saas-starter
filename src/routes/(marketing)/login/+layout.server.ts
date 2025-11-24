// src/routes/(marketing)/+layout.server.ts
import type { LayoutServerLoad } from "./$types"

// Explicit return shape for stronger type-safety and easier refactors.
type AuthState = { signedIn: true; email: string | null } | { signedIn: false }

type LayoutData = {
  url: string
  auth: AuthState
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Defensive checks to avoid accidental leakage of non-serializable values
  // and to normalize absent/invalid emails to `null`.
  const email =
    typeof locals?.user?.email === "string" ? locals.user!.email : null

  const auth: AuthState = locals?.user
    ? { signedIn: true, email }
    : { signedIn: false }

  const data: LayoutData = {
    url: url.origin,
    auth,
  }

  return data
}
