// src/routes/(admin)/account/(menu)/+layout.server.ts
import type { LayoutServerLoad } from "./$types"

// This layout now only passes through data from its parent.
// All entitlement fetching is delegated to the individual pages.
export const load: LayoutServerLoad = async ({ parent }) => {
  const data = await parent()
  return data
}
