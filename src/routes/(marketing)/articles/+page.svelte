<!-- FILE: src/routes/(marketing)/articles/+page.svelte -->
<script lang="ts">
  import { WebsiteName, WebsiteBaseUrl } from "../../../config"
  import { articlesMeta, articleHref } from "$lib/data/articles/meta"

  // Sort newest first
  const ARTICLES = [...articlesMeta].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const TAGS = Array.from(new Set(ARTICLES.flatMap((n) => [...n.tags]))).sort(
    (a, b) => a.localeCompare(b),
  )

  let query = $state("")
  let tag = $state("all")

  // Reactive filtering
  const visible = $derived(
    ARTICLES.filter((n) => {
      const q = query.trim().toLowerCase()
      const matchesQ =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      const matchesTag = tag === "all" || n.tags.includes(tag)
      return matchesQ && matchesTag
    }),
  )

  const canonicalUrl = `${WebsiteBaseUrl}/articles`

  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Articles",
    url: canonicalUrl,
    isPartOf: { "@type": "WebSite", name: WebsiteName, url: WebsiteBaseUrl },
  }).replace(/</g, "\\u003c")

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
  <title>Articles | {WebsiteName}</title>
  <meta
    name="description"
    content="Operational briefings, deep dives, and safety warnings regarding timeline stability."
  />
  <link rel="canonical" href={canonicalUrl} />
  {@html `<script type="application/ld+json">${ldJson}<\/script>`}
</svelte:head>

<main class="py-12 px-4 bg-base-100 min-h-[70vh]">
  <div class="max-w-4xl mx-auto">
    <header class="text-center mb-16">
      <h1 class="text-4xl md:text-6xl font-bold text-primary tracking-tight">
        Mission Logs
      </h1>
      <p class="mt-4 text-xl text-base-content/80 max-w-2xl mx-auto">
        Deep dives into specific targets, anomalies, and things we found in the
        lab fridge.
      </p>

      <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <label class="input flex items-center gap-2 w-full sm:w-96">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5 opacity-70"
          >
            <path
              fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 103.473 9.773l3.127 3.127a.75.75 0 101.06-1.06l-3.127-3.127A5.5 5.5 0 009 3.5zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
              clip-rule="evenodd"
            />
          </svg>
          <input
            id="article-search"
            name="article-search"
            class="grow"
            type="text"
            placeholder="Search logs…"
            bind:value={query}
            aria-label="Search articles"
          />
        </label>

        <select
          id="article-tag"
          name="article-tag"
          class="select w-full sm:w-56"
          bind:value={tag}
          aria-label="Filter articles by tag"
        >
          <option value="all">All tags</option>
          {#each TAGS as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>
    </header>

    <div class="space-y-8">
      {#each visible as article (article.slug)}
        <a
          href={articleHref(article.slug)}
          class="card bg-base-200 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl border border-base-300 hover:border-secondary group text-left"
        >
          <div class="card-body">
            <div
              class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2"
            >
              <span class="text-sm font-mono text-accent opacity-80"
                >{formatDate(article.publishedAt)}</span
              >

              <div class="flex flex-wrap gap-2">
                {#each article.tags as t}
                  <span class="badge badge-outline text-xs">{t}</span>
                {/each}
              </div>
            </div>

            <h2
              class="card-title text-2xl text-secondary group-hover:text-primary transition-colors"
            >
              {article.title}
            </h2>
            <p class="text-base-content/80 mt-2">{article.description}</p>

            <div class="card-actions justify-end mt-4">
              <span
                class="btn btn-sm btn-ghost group-hover:translate-x-1 transition-transform"
                >Read Log →</span
              >
            </div>
          </div>
        </a>
      {/each}

      {#if visible.length === 0}
        <div class="text-center text-base-content/60 py-10">
          No logs found matching your criteria.
        </div>
      {/if}
    </div>
  </div>
</main>
