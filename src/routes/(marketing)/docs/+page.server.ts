// src/routes/(marketing)/docs/+page.server.ts
import type { PageServerLoad } from "./$types"
import { listFiles, type R2File } from "$lib/server/r2"
import { README_PREFIXES, PUBLIC_ASSETS_BASE } from "../../../config"
import { documents as staticDocs } from "$lib/data/docsData"
import { env as privateEnv } from "$env/dynamic/private"

function pickLatest(files: R2File[]): R2File | undefined {
  if (!files?.length) return undefined
  // Choose the newest by LastModified
  return files
    .slice()
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())[0]
}

export const load: PageServerLoad = async () => {
  // Pull READMEs from the public assets bucket
  const PUBLIC_BUCKET = privateEnv.PRIVATE_R2_PUBLIC_BUCKET_NAME!

  // Fetch listings for our new prefixes
  const hoverReadmes = await listFiles(
    README_PREFIXES.hoverboard,
    PUBLIC_ASSETS_BASE,
    PUBLIC_BUCKET,
  )
  const timelineReadmes = await listFiles(
    README_PREFIXES.timeline_c,
    PUBLIC_ASSETS_BASE,
    PUBLIC_BUCKET,
  )

  const documents = staticDocs.map((doc) => {
    let readmeFile: R2File | undefined

    // Map static titles to fetched files
    switch (doc.title) {
      case "Hoverboard Schematics":
        readmeFile = pickLatest(hoverReadmes)
        break
      case "Timeline C Manual":
        readmeFile = pickLatest(timelineReadmes)
        break
    }

    // Fallback to a fragment anchor if no file found
    const finalHref =
      readmeFile?.url ?? `/docs#${doc.title.replace(/\s+/g, "-")}`

    return { ...doc, href: finalHref }
  })

  return { documents }
}
