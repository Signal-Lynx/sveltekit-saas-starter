// vite.config.ts
import { defineConfig } from "vitest/config"
import { sveltekit } from "@sveltejs/kit/vite"
import adapterAuto from "@sveltejs/adapter-auto"
import adapterVercel from "@sveltejs/adapter-vercel"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

const isVitest = !!process.env.VITEST

// Preserve the existing opt-in adapter selection for production/CI.
const useVercel =
  process.env.VERCEL === "1" ||
  process.env.BUILD_TARGET === "vercel" ||
  process.env.ADAPTER === "vercel"

const NATIVE_BUILD_TOOLS = [
  "lightningcss",
  "@tailwindcss/oxide",
  "@tailwindcss/vite",
  "tailwindcss",
]

export default defineConfig({
  plugins: isVitest
    ? []
    : [
        tailwindcss(),
        sveltekit({
          preprocess: vitePreprocess(),
          onwarn(warning, handler) {
            handler(warning)
          },
          adapter: useVercel ? adapterVercel({}) : adapterAuto(),
          inlineStyleThreshold: 0,
          csrf: {
            trustedOrigins: [],
          },
        }),
      ],

  resolve: {
    alias: isVitest
      ? {
          "$app/env/private": path.resolve("tests/mocks/app-env-private.ts"),
          "$app/env/public": path.resolve("tests/mocks/app-env-public.ts"),
          "$app/env": path.resolve("tests/mocks/app-environment.ts"),
        }
      : {},
  },

  // Vite 8 and SvelteKit manage code splitting. The former manualChunks
  // override is ignored and emits a build warning, so do not set it here.

  // 🔧 Keep native CSS toolchain out of SSR/runtime graphs
  optimizeDeps: {
    exclude: NATIVE_BUILD_TOOLS,
  },
  ssr: {
    external: NATIVE_BUILD_TOOLS,
  },

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
    // Preserve Vitest 4 mock lifecycle behavior during the isolated upgrade.
    clearMocks: false,
    environment: "node",
    deps: {
      optimizer: {
        ssr: {
          include: ["svelte", "@sveltejs/kit"],
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      exclude: [
        "node_modules/",
        "build/",
        ".svelte-kit/",
        "coverage/",
        "**/*.d.ts",
        "**/*.test.*",
        "**/*.spec.*",
      ],
    },
    // 🔇 Hide expected noisy logs during tests
    onConsoleLog(log, type) {
      // Vitest only passes "stdout" | "stderr" here.
      // Warnings/errors end up on stderr, so filtering stderr covers both.
      if (type === "stderr") {
        const mute = [
          /Email not configured/i,
          /Error updating subscription status/i,
        ]
        if (mute.some((r) => r.test(log))) return false
      }
    },
  },
})
