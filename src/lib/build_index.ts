// Build a lightweight search index from products + a few static pages.
// - Keeps the same inputs (imports) and the same output shape:
//   { index: <Fuse JSON>, indexData: Array<{title, description, body, path}>, buildTime: number }
// - Improves robustness (null-safety, minor typing, sanitized text) without changing behavior.

import Fuse from "fuse.js"
import { allProducts } from "$lib/data/products"

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

// ---- Static pages included in search ---------------------------------------

const otherPages: ReadonlyArray<SearchRecord> = [
  {
    title: "Home",
    description: "The open source, fast, and free to host SaaS template.",
    body: "",
    path: "/",
  },
  {
    title: "Documentation",
    description:
      "Setup guides, READMEs, and technical documentation for Signal Lynx products.",
    body: "",
    path: "/docs",
  },
  {
    title: "Contact Us",
    description: "Get in touch with us for demos, quotes, or questions.",
    body: "",
    path: "/contact_us",
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
  const title = toCleanText(
    product?.title ?? product?.name ?? product?.id ?? "",
  )
  const description = toCleanText(product?.tagline ?? "")
  const body = featuresToBody(product?.features)
  const path =
    product?.id === "license-hub" ? "/key-commander" : "/trading-automation"

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

  const indexData: SearchRecord[] = [
    ...productRecords,
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
