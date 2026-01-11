export const GET = () =>
  new Response(
    JSON.stringify([{ user_agent: "prefetch-proxy", disallow: true }]),
    {
      headers: {
        "content-type": "application/trafficadvice+json; charset=utf-8",
        "x-content-type-options": "nosniff",
        "cache-control": "public, max-age=1800",
      },
    },
  )
