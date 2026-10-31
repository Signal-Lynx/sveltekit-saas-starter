// Regression smoke for the Vercel Supabase SSR/CommonJS startup failure.
// @supabase/ssr 0.12.x uses cookie 1.x, while SvelteKit 3 uses cookie 2.x.
import { createRequire } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)

function cookieVersion(resolvedFile) {
  let dir = dirname(resolvedFile)
  while (true) {
    const manifest = join(dir, "package.json")
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, "utf8"))
      if (pkg.name === "cookie") return pkg.version
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Cannot locate cookie package for ${resolvedFile}`)
    }
    dir = parent
  }
}

try {
  // Load the *CommonJS* entry — the form that crashed in Vercel's function.
  const ssr = require("@supabase/ssr")
  if (typeof ssr.createServerClient !== "function") {
    throw new Error("Supabase SSR did not expose createServerClient")
  }

  const supabaseRequire = createRequire(require.resolve("@supabase/ssr"))
  const ssrCookieVersion = cookieVersion(supabaseRequire.resolve("cookie"))
  const appCookieVersion = cookieVersion(require.resolve("cookie"))

  if (!ssrCookieVersion.startsWith("1.")) {
    throw new Error(
      `Supabase SSR must resolve cookie 1.x, found ${ssrCookieVersion}`,
    )
  }
  if (!appCookieVersion.startsWith("2.")) {
    throw new Error(
      `App/SvelteKit must resolve cookie 2.x, found ${appCookieVersion}`,
    )
  }

  console.log(
    `Runtime dependency check passed: Supabase cookie ${ssrCookieVersion}; app cookie ${appCookieVersion}`,
  )
} catch (err) {
  console.error("Runtime dependency check FAILED:", err)
  process.exitCode = 1
}
