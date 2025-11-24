// src/routes/(marketing)/login/confirm/+server.ts
import { redirect, type RequestHandler } from "@sveltejs/kit"

export const GET: RequestHandler = ({ url, request }) => {
  const qp = url.searchParams.toString()
  const dest = new URL(
    `/auth/callback${qp ? `?${qp}` : ""}`,
    request.url,
  ).toString()
  throw redirect(303, dest)
}
