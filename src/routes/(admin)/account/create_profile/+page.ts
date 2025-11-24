// src/routes/(admin)/account/create_profile/+page.ts
import { redirect } from "@sveltejs/kit"
import type { PageLoad } from "./$types"
import type { Database } from "$lib/types/database"

// Narrow row type for clarity
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

// The fields required for considering a profile "full"
const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "company_name",
  "website",
] as const
type RequiredProfileKey = (typeof REQUIRED_PROFILE_FIELDS)[number]

/**
 * Returns true when all required profile fields exist and are non-empty strings.
 * Semantics match the original implementation (truthy string checks).
 */
export const _hasFullProfile = (profile: ProfileRow | null): boolean => {
  if (!profile) return false

  for (const key of REQUIRED_PROFILE_FIELDS) {
    const value = profile[key as RequiredProfileKey]
    if (typeof value !== "string" || value.length === 0) {
      return false
    }
  }
  return true
}

export const load: PageLoad = async ({ parent }) => {
  const data = await parent()

  // They completed their profile! Redirect to "Select a Plan" screen.
  if (_hasFullProfile((data as any)?.profile as ProfileRow | null)) {
    throw redirect(303, "/account/select_plan")
  }

  return data
}
