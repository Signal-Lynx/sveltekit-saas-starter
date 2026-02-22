// vite.config.ts
import { defineConfig } from "vitest/config"
import { sveltekit } from "@sveltejs/kit/vite"
import path from "node:path"

const isVitest = !!process.env.VITEST

export default defineConfig({
  // Avoid Svelte plugin during Vitest (prevents HMR crash)
  plugins: isVitest ? [] : [sveltekit()],

  // When the plugin is off, we must provide aliases for SvelteKit virtual ids
  resolve: {
    alias: isVitest
      ? {
          // --- $env stubs (you already added these files) ---
          "$env/dynamic/private": path.resolve(
            "tests/mocks/env-dynamic-private.ts",
          ),
          "$env/static/private": path.resolve(
            "tests/mocks/env-static-private.ts",
          ),

          // --- $app stubs (keeps imports like $app/environment happy) ---
          "$app/environment": path.resolve("tests/mocks/app-environment.ts"),

          // --- $lib/* and friends used across your code/tests ---
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

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,

    environment: "node",

    // Silence Vitest v2 deprecation by using the new optimizer include
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
    onConsoleLog(
      log: string,
      type: "stdout" | "stderr" | "log" | "warn" | "error" | "debug",
    ) {
      if (type === "stderr" || type === "warn") {
        const mute = [
          /Email not configured/i,
          /Error updating subscription status/i,
        ]
        if (mute.some((r) => r.test(log))) return false
      }
    },
  },
})
