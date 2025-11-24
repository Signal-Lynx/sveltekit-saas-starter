// src/routes/api/report-error/+server.ts
import { json } from "@sveltejs/kit"
import { reportWebsiteError } from "$lib/server/errorApi"
import type { RequestHandler } from "./$types"

// This endpoint receives unauthenticated errors from the client-side (browser)
// and forwards them to the License Manager using our secure server-side service.
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const errorData = await request.json()

    // Re-constitute an Error-like object for consistent reporting format
    const clientError = new Error(errorData.message || "Client-side error")
    clientError.stack = errorData.stack || "No stack trace from client."

    // Use the same reporting function, passing the current user from locals.
    // This securely associates the error with a logged-in user if one exists.
    await reportWebsiteError(clientError, locals.user)

    return json({ success: true }, { status: 202 })
  } catch (e) {
    // This log is for errors in this endpoint itself, not the client error being reported.
    console.error("Failed to process client-side error report:", e)
    // Return a generic error to avoid leaking details.
    return json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    )
  }
}
