// svelte.config.js
import adapterAuto from "@sveltejs/adapter-auto"
import adapterVercel from "@sveltejs/adapter-vercel"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** Choose Vercel adapter only when explicitly requested (CI/deploy). */
const useVercel =
  process.env.VERCEL === "1" ||
  process.env.BUILD_TARGET === "vercel" ||
  process.env.ADAPTER === "vercel"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  onwarn(warning, handler) {
    handler(warning)
  },

  kit: {
    adapter: useVercel ? adapterVercel({}) : adapterAuto(),
    inlineStyleThreshold: 150000,

    csrf: {
      // same-origin only by default; add trusted 3p origins if needed
      trustedOrigins: [],
    },

    alias: {
      $components: "src/lib/components",
      $server: "src/lib/server",
      $routes: "src/routes",
      $types: "src/lib/types",
      $data: "src/lib/data",
      $utils: "src/lib/utils",
      $ui: "src/lib/ui",
    },

    env: {
      publicPrefix: "PUBLIC_",
    },
  },
}

export default config
