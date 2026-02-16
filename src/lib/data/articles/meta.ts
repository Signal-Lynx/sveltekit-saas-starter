// FILE: src/lib/data/articles/meta.ts

export interface ArticleMeta {
  slug: string
  title: string
  description: string
  publishedAt: string // YYYY-MM-DD
  author: string
  tags: readonly string[]

  // Optional “dual-title” SEO fields:
  // - seoTitle: what goes into the HTML <title> tag (SERP title)
  // - seoDescription: what goes into meta description (SERP snippet)
  seoTitle?: string
  seoDescription?: string
}

export const articlesMeta: readonly ArticleMeta[] = [
  {
    slug: "hr-policy-temporal-duplicates",
    title: "HR Update: Working with your Temporal Duplicates",
    description:
      "Clarification on salary splitting, desk space, and why you cannot list your future self as an emergency contact.",
    publishedAt: "2025-12-15",
    author: "Paradox HR",
    tags: ["Compliance", "HR", "Time Travel"],
  },
  {
    slug: "case-file-timeline-b",
    title: "Case File: Timeline B (DO NOT ENTER)",
    description:
      "A mandatory briefing on why we skipped straight to C. Includes safety protocols regarding the Land Octopuses.",
    publishedAt: "2025-11-04",
    author: "Paradox Safety Team",
    tags: ["Safety", "Temporal Mechanics", "Cephalopods"],
  },
] as const

export function articleHref(slug: string): string {
  return `/articles/${slug}`
}
