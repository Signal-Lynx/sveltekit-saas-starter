<!-- FILE: src/routes/(marketing)/docs/+page.svelte -->
<script lang="ts">
  import { WebsiteName, WebsiteBaseUrl } from "../../../config"
  import type { PageData } from "./$types"
  import type { DocumentMeta } from "$lib/data/docsData"

  // Data comes from the server loader via $props
  const { data } = $props<{ data: PageData }>()

  // 1. Define the desired display order (Maintains SaaS template context)
  const displayOrder = ["Hoverboard Schematics", "Timeline C Manual"]

  // 2. Prepare documents for UI and build the SEO data in the script.
  const processedDocs = $derived.by(() => {
    const docs = Array.isArray(data?.documents) ? data.documents : []
    return [...docs]
      .sort((a, b) => {
        const indexA = displayOrder.indexOf(a.title)
        const indexB = displayOrder.indexOf(b.title)
        const safeA = indexA === -1 ? 999 : indexA
        const safeB = indexB === -1 ? 999 : indexB
        return safeA - safeB
      })
      .map((doc: DocumentMeta) => ({
        ...doc,
        absoluteUrl: doc.href?.startsWith("http")
          ? doc.href
          : `${WebsiteBaseUrl}${doc.href}`,
      }))
  })

  // 3. Build the final JSON string here.
  const ldJson = $derived.by(() =>
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Documentation - ${WebsiteName}`,
      description:
        "Owner's manuals for Key Commander, Lynx-Relay, and Signal Shield.",
      hasPart: processedDocs.map((d) => ({
        "@type": "CreativeWork",
        name: d.title,
        about: d.subtitle,
        description: d.description,
        url: d.absoluteUrl,
      })),
    }).replace(/</g, "\\u003c"),
  )
</script>

<svelte:head>
  <title>Documentation - {WebsiteName}</title>
  <meta
    name="description"
    content={`The Owner's Manuals. Downloadable READMEs, setup guides, and technical deep-dives for all ${WebsiteName} products.`}
  />
  {@html `<script type="application/ld+json">${ldJson}<\/script>`}
</svelte:head>

<main class="py-12 px-4 bg-base-100" aria-labelledby="owner-manuals-heading">
  <div class="max-w-3xl mx-auto">
    <header class="text-center mb-16">
      <h1
        id="owner-manuals-heading"
        class="text-4xl md:text-6xl font-bold text-primary"
      >
        The Owner&apos;s Manuals
      </h1>
      <p id="owner-manuals-desc" class="mt-4 text-xl max-w-2xl mx-auto">
        Don&apos;t just wing it. Here are the secret scrolls, the forbidden
        texts, and... well, they&apos;re READMEs. Read &apos;em before you
        accidentally summon a demon or, worse, file a support ticket for
        something that&apos;s on page one.
      </p>
    </header>

    <section aria-describedby="owner-manuals-desc">
      <ul class="space-y-8">
        {#each processedDocs as doc (doc.title)}
          <li>
            <article
              class="card card-bordered bg-base-200 shadow-xl transition-all duration-300 border-2 border-transparent hover:border-accent"
            >
              <div class="card-body">
                <h2 class="card-title text-2xl text-secondary">{doc.title}</h2>
                <p class="font-semibold text-accent -mt-2">{doc.subtitle}</p>
                <p class="mt-4 text-base-content/80">{doc.description}</p>
                <div class="card-actions justify-end mt-4">
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer external"
                    class="btn btn-primary btn-gradient-electric"
                    aria-label={`Open ${doc.title} manual in a new tab`}
                    title={`Open ${doc.title} manual`}
                  >
                    Read the Manual
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 ml-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                      />
                      <path
                        d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          </li>
        {/each}
      </ul>
    </section>
  </div>
</main>
