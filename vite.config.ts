// vite.config.ts
import { defineConfig } from "vitest/config"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

const isVitest = !!process.env.VITEST

const NATIVE_BUILD_TOOLS = [
  "lightningcss",
  "@tailwindcss/oxide",
  "@tailwindcss/vite",
  "tailwindcss",
]

export default defineConfig({
  plugins: isVitest ? [] : [tailwindcss(), sveltekit()],

  resolve: {
    alias: isVitest
      ? {
          "$env/dynamic/private": path.resolve(
            "tests/mocks/env-dynamic-private.ts",
          ),
          "$env/static/private": path.resolve(
            "tests/mocks/env-static-private.ts",
          ),
          "$app/environment": path.resolve("tests/mocks/app-environment.ts"),
          $lib: path.resolve("src/lib"),
          $components: path.resolve("src/lib/components"),
          $server: path.resolve("src/lib/server"),
          $routes: path.resolve("src/routes"),
          $types: path.resolve("src/lib/types"),
          $data: path.resolve("src/lib/data"),
          $utils: path.resolve("src/lib/utils"),
          $ui: path.resolve("src/lib/ui"),
        }
      : {},
  },

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
