// tailwind.config.js
import typography from "@tailwindcss/typography"
import daisyui from "daisyui"
import { saasstartertheme } from "./src/lib/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  // Scan SvelteKit sources (keeps your original set; adds md/mdx for future docs without affecting output)
  content: ["./src/**/*.{html,js,svelte,ts,md,mdx}"],

  // Explicit dark mode strategy (DaisyUI still controls colors via data-theme)
  darkMode: "class",

  theme: {
    extend: {
      fontFamily: {
        handwriting: ["Kalam", "cursive"],
      },
    },
  },

  // Keep existing plugins
  plugins: [typography, daisyui],

  // Prevent purge from stripping dynamically-generated classes you use
  safelist: [
    // Typography variants often toggled at runtime or in MD content
    "prose",
    "prose-sm",
    "prose-lg",
    "prose-invert",

    // From $lib/ui/badge.ts (returned dynamically)
    "badge-success",
    "badge-info",
    "badge-warning",
    "badge-ghost",
  ],

  // DaisyUI config (no visual change; clearer defaults + stability)
  daisyui: {
    // Put CSS vars at :root to avoid scoping surprises in nested layouts
    themeRoot: ":root",
    // Use your custom palette as the dark theme too (matches your current usage)
    darkTheme: "saasstartertheme",
    // Reduce noisy logs in dev without affecting styles
    logs: false,

    themes: [
      {
        saasstartertheme,
      },
    ],
  },
}

export default config
