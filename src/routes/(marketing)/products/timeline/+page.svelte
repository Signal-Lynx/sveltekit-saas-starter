<script lang="ts">
  import { timelineProduct } from "$lib/data/products"
  import { fly } from "svelte/transition"
  import { WebsiteName, WebsiteBaseUrl } from "../../../../config"
  import ProductCard from "$lib/components/ProductCard.svelte"

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Timeline C Access",
    description: "A subscription to a better reality.",
    url: `${WebsiteBaseUrl}/products/timeline`,
  }

  const jsonldScript = `<script type="application/ld+json">${JSON.stringify(ldJson)}<\/script>`
</script>

<svelte:head>
  <title>Timeline C | {WebsiteName}</title>
  <meta name="description" content="Upgrade your reality. Access Timeline C." />
  {@html jsonldScript}
</svelte:head>

<!-- Banner -->
<section class="pt-20 pb-1 bg-base-200">
  <div class="max-w-6xl mx-auto text-center px-4">
    <div
      class="inline-block px-8 py-6 border-2 border-accent bg-base-100 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
    >
      <h1
        class="text-4xl lg:text-6xl font-bold text-primary tracking-wider leading-tight"
      >
        Timeline C
      </h1>
      <p class="text-xl lg:text-2xl font-semibold text-secondary pt-2 italic">
        A Better Reality
      </p>
    </div>
  </div>
</section>

<!-- Hero -->
<section class="py-16 px-4 bg-base-200">
  <div
    class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
  >
    <div class="text-left" in:fly={{ y: 20, duration: 600 }}>
      <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">
        Why stay here?
      </h2>
      <p class="mt-4 text-xl text-base-content/80 leading-relaxed">
        Let's be honest. This timeline (Timeline A) is full of bugs, traffic
        jams, and merge conflicts. It's deprecated.
        <br /><br />
        In <strong>Timeline C</strong>, everything just works.
      </p>

      <div
        class="mt-8 p-6 bg-base-100 border-l-4 border-success rounded-r-lg shadow-md"
      >
        <h3 class="font-bold text-lg text-secondary mb-3">
          Timeline C Features:
        </h3>
        <ul class="space-y-3">
          <li class="flex gap-3 items-center">
            <span class="badge badge-success badge-sm">✓</span>
            <span>Coffee is free and actually wakes you up.</span>
          </li>
          <li class="flex gap-3 items-center">
            <span class="badge badge-success badge-sm">✓</span>
            <span>Bitcoin is stable at $100k.</span>
          </li>
          <li class="flex gap-3 items-center">
            <span class="badge badge-success badge-sm">✓</span>
            <span>Printers work on the first try.</span>
          </li>
          <li class="flex gap-3 items-center">
            <span class="badge badge-success badge-sm">✓</span>
            <span>The finale of that one show didn't suck.</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex justify-center">
      <ProductCard product={timelineProduct} />
    </div>
  </div>
</section>

<!-- FAQ Mini-Section -->
<section class="py-16 bg-base-100">
  <div class="max-w-4xl mx-auto text-center px-4">
    <h2 class="text-3xl font-bold text-secondary mb-8">
      Frequently Asked Questions
    </h2>

    <div class="grid gap-6 text-left">
      <div class="collapse collapse-arrow bg-base-200 border border-base-300">
        <input type="radio" name="timeline-faq" checked />
        <div class="collapse-title text-xl font-medium">How do I get back?</div>
        <div class="collapse-content">
          <p>
            If you cancel your subscription, you are automatically dumped back
            into Timeline A. Yes, the one with the expensive gas. We recommend
            auto-renew.
          </p>
        </div>
      </div>

      <div class="collapse collapse-arrow bg-base-200 border border-base-300">
        <input type="radio" name="timeline-faq" />
        <div class="collapse-title text-xl font-medium">Is this legal?</div>
        <div class="collapse-content">
          <p>
            In Timeline C? Absolutely. In Timeline A? It's a grey area. We
            operate under maritime law just to be safe.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
