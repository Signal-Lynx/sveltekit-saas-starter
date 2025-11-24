<script lang="ts">
  import { hoverProducts } from "$lib/data/products"
  import { fly } from "svelte/transition"
  import { WebsiteName, WebsiteBaseUrl } from "../../../../config"
  import ProductCard from "$lib/components/ProductCard.svelte"

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Hover Conversion Kit",
    description: "Anti-gravity schematics for the modern skater.",
    url: `${WebsiteBaseUrl}/products/hover`,
  }

  const jsonldScript = `<script type="application/ld+json">${JSON.stringify(ldJson)}<\/script>`
</script>

<svelte:head>
  <title>Hover Tech | {WebsiteName}</title>
  <meta
    name="description"
    content="Gravity is optional. Download the schematics."
  />
  {@html jsonldScript}
</svelte:head>

<!-- Banner -->
<section class="pt-20 pb-1 bg-base-200">
  <div class="max-w-6xl mx-auto text-center px-4">
    <div
      class="inline-block px-8 py-6 border-2 border-accent bg-base-100 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
    >
      <h1
        class="text-4xl lg:text-6xl font-bold text-primary tracking-wider leading-tight uppercase"
      >
        Anti-Gravity
      </h1>
      <p class="text-xl lg:text-2xl font-semibold text-secondary pt-2 italic">
        Paradox Innovations Lab
      </p>
    </div>
  </div>
</section>

<!-- Hero / Intro -->
<section class="py-16 px-4 bg-base-200">
  <div
    class="max-w-6xl mx-auto text-center mb-16"
    in:fly={{ y: 20, duration: 600 }}
  >
    <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">
      Friction is for Suckers.
    </h2>
    <p class="mt-4 text-xl max-w-2xl mx-auto text-base-content/80">
      We figured out the math. It turns out gravity is just a suggestion if you
      yell at it loud enough. Stop rolling on asphalt like a caveman. Start
      floating.
    </p>
  </div>

  <!-- Product Cards Grid -->
  <div
    class="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-4 justify-center items-stretch"
  >
    {#each hoverProducts as product}
      <ProductCard {product} />
    {/each}
  </div>
</section>

<!-- Warning / Disclaimer -->
<section class="py-20 bg-base-100">
  <div class="max-w-4xl mx-auto text-center px-4">
    <div class="alert alert-warning shadow-lg max-w-2xl mx-auto text-left">
      <div class="flex-1">
        <h3 class="font-bold text-lg mb-1">⚠️ Safety Warning</h3>
        <p>
          Do not use over water unless you have power. We are not responsible
          for wet shoes, bruised egos, or accidental temporal displacement. If
          you start fading from family photos, please contact support
          immediately.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Feature Deep Dive -->
<section class="py-16 bg-base-200">
  <div class="max-w-6xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div class="text-left space-y-6">
        <h2 class="text-3xl font-bold text-primary">
          The Tech Behind the Float
        </h2>
        <div class="space-y-4 text-lg text-base-content/80">
          <p>
            <strong class="text-secondary">Zero-Point Energy:</strong> We harness
            the background radiation of the universe to lift your board 6 inches
            off the ground. It's green energy, mostly because it glows green.
          </p>
          <p>
            <strong class="text-secondary">The Pit Bull System:</strong> Our proprietary
            propulsion system doesn't just move you forward; it actively judges pedestrians
            who are still walking.
          </p>
          <p>
            <strong class="text-secondary">Firmware Updates:</strong> Join the
            <strong>Anti-Gravity Society</strong> to get monthly patches. We fix
            bugs, improve stability, and occasionally add unauthorized flight capabilities.
          </p>
        </div>
      </div>

      <!-- Visual Placeholder (CSS Shapes) -->
      <div
        class="flex justify-center items-center h-64 bg-base-100 rounded-xl border border-accent/30 relative overflow-hidden"
      >
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10"
        ></div>
        <div class="text-center">
          <div class="text-6xl mb-4">🛹 + 🧲 = 🛸</div>
          <p class="font-mono text-accent text-sm">
            Schematic Preview: Classified
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
