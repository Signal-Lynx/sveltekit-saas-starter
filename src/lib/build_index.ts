// Build a lightweight search index from products + a few static pages.
// - Keeps the same inputs (imports) and the same output shape:
//   { index: <Fuse JSON>, indexData: Array<{title, description, body, path}>, buildTime: number }
// - Improves robustness (null-safety, minor typing, sanitized text) without changing behavior.

// Build a lightweight search index from products + a few static pages.
// - Keeps the same inputs (imports) and the same output shape:
//   { index: <Fuse JSON>, indexData: Array<{title, description, body, path}>, buildTime: number }
// - Improves robustness (null-safety, minor typing, sanitized text) without changing behavior.

import Fuse from "fuse.js"
import { allProducts } from "$lib/data/products"
// Template uses articlesMeta, not nightShiftNotesMeta
import { articlesMeta, articleHref } from "$lib/data/articles/meta"

// ---- Types -----------------------------------------------------------------

type SearchRecord = {
  title: string
  description: string
  body: string
  path: string
}

type BuildResult = {
  index: ReturnType<ReturnType<(typeof Fuse)["createIndex"]>["toJSON"]>
  indexData: SearchRecord[]
  buildTime: number
}

// ---- Static pages included in search (PARADOX INNOVATIONS EDITION) ----------

const otherPages: ReadonlyArray<SearchRecord> = [
  {
    title: "Home",
    description:
      "Paradox Innovations: Solving tomorrow's problems by causing them today.",
    body: "hoverboard time travel paradox timeline c",
    path: "/",
  },
  {
    title: "Products",
    description:
      "Experimental Catalog. Anti-gravity schematics and reality stabilization.",
    body: "hoverboard antigrav timeline c licensing trading",
    path: "/products",
  },
  {
    title: "Hover Tech",
    description: "Anti-Gravity Schematics. Gravity is optional.",
    body: "hoverboard schematics conversion kit antigrav",
    path: "/products/hover",
  },
  {
    title: "Timeline C",
    description:
      "Reality Stabilization Protocol. Upgrade to a better timeline.",
    body: "timeline c access pass reality stable",
    path: "/products/timeline",
  },
  {
    title: "Articles",
    description: "Mission Logs. Operational briefings and anomalies.",
    body: "blog news updates",
    path: "/articles",
  },
  {
    title: "Documentation",
    description: "Owner's manuals and technical deep-dives.",
    body: "docs setup guide readme install",
    path: "/docs",
  },
  {
    title: "FAQ",
    description: "Knowledge Base. Answers to your burning questions.",
    body: "questions help support paradox",
    path: "/faq",
  },
  {
    title: "Contact Us",
    description: "Open a channel to the Paradox team.",
    body: "contact support email help",
    path: "/contact_us",
  },
  {
    title: "Legal Center",
    description: "Terms, policies, and legal notices.",
    body: "legal terms privacy dmca billing",
    path: "/legal",
  },
] as const

// ---- Helpers ----------------------------------------------------------------

/** Coerce any value to a clean, single-line string suitable for search text. */
function toCleanText(v: unknown): string {
  if (v == null) return ""
  const s = String(v)
  // Collapse whitespace/newlines to single spaces, trim ends
  return s.replace(/\s+/g, " ").trim()
}

/** Safely combine an array of feature bullets into one searchable string. */
function featuresToBody(features: unknown): string {
  if (!Array.isArray(features)) return ""
  // Only keep truthy items, stringify defensively, and join with spaces
  return features
    .filter(Boolean)
    .map((x) => toCleanText(x))
    .filter((x) => x.length > 0)
    .join(" ")
}

/** Map product -> SearchRecord. Path logic is intentionally preserved. */
function productToRecord(product: any): SearchRecord {
  const title = toCleanText(product?.title ?? product?.id ?? "")
  const name = toCleanText(product?.name ?? "")
  const id = toCleanText(product?.id ?? "")
  const description = toCleanText(product?.tagline ?? "")

  // Include name/id/title in searchable body so queries like "Key Commander" / "Hoverboard" hit.
  const body = [name, id, title, featuresToBody(product?.features)]
    .filter(Boolean)
    .join(" ")

  // Prefer the product's actual href if present (Robust logic from Prod)
  const path = toCleanText(product?.href) || "/products"

  return { title, description, body, path }
}

// ---- Main -------------------------------------------------------------------

/**
 * Build the search index for the site.
 * Returns a serialized Fuse index, the raw index data, and a build timestamp.
 */
export async function buildSearchIndex(): Promise<BuildResult> {
  // Preserve ordering: products first, then static pages
  const productRecords: SearchRecord[] = allProducts.map(productToRecord)

  // Map Articles to search records
  const articleRecords: SearchRecord[] = articlesMeta.map((n) => ({
    title: toCleanText(n.title),
    description: toCleanText(n.description),
    body: toCleanText(n.tags.join(" ")),
    path: articleHref(n.slug),
  }))

  const indexData: SearchRecord[] = [
    ...productRecords,
    ...articleRecords,
    ...otherPages.map((p) => ({
      // Ensure fields are sanitized even though otherPages is already typed
      title: toCleanText(p.title),
      description: toCleanText(p.description),
      body: toCleanText(p.body),
      path: p.path,
    })),
  ]

  // Keys intentionally unchanged to preserve consumer expectations
  const keys: string[] = ["title", "description", "body"]

  const index = Fuse.createIndex(keys, indexData)
  const jsonIndex = index.toJSON()

  return {
    index: jsonIndex,
    indexData,
    buildTime: Date.now(),
  }
}
