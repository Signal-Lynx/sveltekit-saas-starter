<!-- FILE: src/routes/(marketing)/articles/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from "./$types"
  import { WebsiteBaseUrl, WebsiteName } from "../../../../config"
  import ContentPage from "$lib/components/layout/ContentPage.svelte"

  const { data } = $props<{ data: PageData }>()

  const meta = $derived(data.meta)
  const post = $derived(data.post)
  const href = $derived(data.href)

  const canonicalUrl = $derived.by(() => `${WebsiteBaseUrl}${href}`)

  // Dual-title values (SERP title/description)
  const seoTitle = $derived.by(() => meta.seoTitle ?? meta.title)
  const seoDescription = $derived.by(
    () => meta.seoDescription ?? meta.description,
  )

  // Conservative default. If you later add a dedicated OG image per article, update logic here.
  const ogImageUrl = $derived.by(() => `${WebsiteBaseUrl}/logo.png`)

  // Structured data (Article + Breadcrumbs)
  const ldJson = $derived.by(() =>
    JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: seoTitle,
          alternativeHeadline: meta.title,
          description: seoDescription,
          datePublished: meta.publishedAt,
          author: { "@type": "Organization", name: meta.author },
          mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
          url: canonicalUrl,
          keywords: (meta.tags ?? []).join(", "),
          image: [ogImageUrl],
          publisher: {
            "@type": "Organization",
            name: WebsiteName,
            url: WebsiteBaseUrl,
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: WebsiteBaseUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Articles",
              item: `${WebsiteBaseUrl}/articles`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: meta.title,
              item: canonicalUrl,
            },
          ],
        },
      ],
    }).replace(/</g, "\\u003c"),
  )

  function formatDate(iso: string) {
    if (!iso) return ""
    const date = new Date(iso)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date)
  }
</script>

<svelte:head>
  <meta property="og:type" content="article" />
  <meta property="og:title" content={seoTitle} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImageUrl} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={seoTitle} />
  <meta name="twitter:description" content={seoDescription} />
  <meta name="twitter:image" content={ogImageUrl} />

  {@html `<script type="application/ld+json">${ldJson}<\/script>`}
  <link rel="canonical" href={canonicalUrl} />
</svelte:head>

<ContentPage
  title={meta.title}
  description={meta.description}
  {seoTitle}
  {seoDescription}
>
  <div
    class="flex flex-wrap gap-4 items-center mb-8 text-sm text-base-content/60 font-mono border-b border-base-content/10 pb-4"
  >
    <span>{formatDate(meta.publishedAt)}</span>
    <span>•</span>
    <span>{meta.author}</span>
    <div class="flex gap-2 ml-auto">
      {#each meta.tags as tag}
        <span class="badge badge-sm badge-ghost">{tag}</span>
      {/each}
    </div>
  </div>

  <!-- Content is trusted static HTML from posts.ts -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="article-content">
    {@html post.contentHtml}
  </div>

  <div class="mt-12 pt-8 border-t border-base-content/10">
    <a href="/articles" class="btn btn-outline btn-sm"> ← Back to Logs </a>
  </div>
</ContentPage>
