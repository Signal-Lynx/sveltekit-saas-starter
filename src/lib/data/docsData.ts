// FILE: src/lib/data/docsData.ts

export interface DocumentMeta {
  title: string
  subtitle: string
  description: string
  // The 'href' is optional, added dynamically by the server loader
  href?: string
}

export const documents: readonly DocumentMeta[] = [
  {
    title: "Hoverboard Schematics",
    subtitle: "Mk.II Assembly Guide",
    description:
      "Critical assembly instructions. Includes wiring diagrams for the flux capacitor and safety warnings for water traversal.",
  },
  {
    title: "Timeline C Manual",
    subtitle: "Reality Stabilization Protocol",
    description:
      "How to access the dashboard, configure your reality anchor, and avoid accidental timeline merges.",
  },
]
