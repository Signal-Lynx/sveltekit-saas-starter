// FILE: src/lib/theme.ts

// Centralized DaisyUI theme object for easy customization.
export const saasstartertheme = {
  "color-scheme": "dark",

  // Primary: Electric Violet / Flux Capacitor Purple - for major headlines and branding
  primary: "#8B5CF6",
  "primary-content": "#ffffff",

  // Secondary: Radioactive Green / Isotope - for primary actions and "success" states
  secondary: "#10B981",
  "secondary-content": "#000000", // Black text for high contrast on green

  // Accent: Hot Pink / Neon Sign - for links, highlights, and "wow" moments
  accent: "#F472B6",
  "accent-content": "#000000",

  // Neutral: Dark Matter Grey - for secondary text and structural elements
  neutral: "#1F2937",
  "neutral-content": "#F3F4F6",

  // Base: Deep Void - Darker, colder background tones for that "Sci-Fi Lab" feel
  "base-100": "#0f172a", // Deep slate blue/black
  "base-200": "#1e293b", // Slightly lighter slate
  "base-300": "#334155", // Medium slate
  "base-content": "#e2e8f0", // Light grey text

  info: "#3B82F6",
  success: "#22C55E",
  warning: "#FBBF24",
  error: "#EF5350",

  "info-content": "#ffffff",
  "success-content": "#000000",
  "warning-content": "#000000",
  "error-content": "#ffffff",

  // Slightly sharper corners for a more "technical/lab" aesthetic
  "--rounded-btn": "0.5rem",
  "--rounded-box": "0.5rem",
}
