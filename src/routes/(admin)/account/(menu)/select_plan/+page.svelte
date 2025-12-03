<!-- src/routes/(admin)/account/select_plan/+page.svelte -->
<script lang="ts">
  import PricingModule from "$lib/components/pricing_module.svelte"
  import { WebsiteName as RawWebsiteName } from "../../../../../config"

  // Defensive fallback so the title never renders "undefined"
  const WebsiteName = RawWebsiteName ?? "Your Account"
</script>

<svelte:head>
  <title>Choose Your Arsenal - {WebsiteName}</title>
  <!-- Account pages shouldn't be indexed -->
  <meta name="robots" content="noindex, nofollow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta
    name="description"
    content="Select a plan to deploy your tools and go live."
  />
</svelte:head>

<main class="bg-base-100 min-h-screen">
  <section
    class="max-w-7xl mx-auto px-6 lg:px-12 py-10"
    aria-labelledby="page-title"
  >
    <header class="text-center">
      <h1 id="page-title" class="text-4xl font-bold text-primary mb-2">
        Choose Your Arsenal
      </h1>
      <p class="text-lg text-base-content/80 max-w-2xl mx-auto">
        Your account is ready. Select a plan below to deploy your tools and go
        live.
      </p>
    </header>

    <div class="mt-8" data-testid="pricing-module">
      <PricingModule
        callToAction="Deploy Plan"
        ctaClass="btn-gradient-electric"
      />
    </div>

    <noscript>
      <div class="alert alert-warning mt-6 max-w-2xl mx-auto text-left">
        <span class="font-semibold">JavaScript is disabled.</span>
        <span class="block mt-1">
          Pricing selection requires JavaScript. Please enable it to continue.
        </span>
      </div>
    </noscript>
  </section>
</main>
