<script lang="ts">
  import { WebsiteName } from "../../../config"
</script>

<svelte:head>
  <title>Experimental Catalog | {WebsiteName}</title>
  <meta
    name="description"
    content="Browse active research divisions. Anti-gravity schematics and reality stabilization subscriptions."
  />
</svelte:head>

<section class="py-20 px-4 bg-base-200 min-h-[70vh]">
  <div class="max-w-4xl mx-auto text-center">
    <h1 class="text-4xl md:text-6xl font-bold text-primary mb-6">
      Experimental Catalog
    </h1>
    <p class="text-xl text-base-content/80 mb-12 max-w-2xl mx-auto">
      Current active research divisions. Select a department to view available
      schematics and access passes.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
      <!-- Card 1: Hover Tech -->
      <a
        href="/products/hover"
        class="card bg-base-100 shadow-xl border-2 border-transparent hover:border-accent transition-all duration-300 hover:-translate-y-1 group"
      >
        <div class="card-body">
          <h2
            class="card-title text-3xl text-accent group-hover:text-primary transition-colors"
          >
            Hover Tech
          </h2>
          <p class="font-bold text-base-content/90">Anti-Gravity Schematics</p>
          <p class="text-base-content/70 mt-2">
            Detailed plans for magnet-taping and voiding warranties. Includes
            the Anti-Gravity Society membership.
          </p>
          <div class="card-actions justify-end mt-4">
            <span class="btn btn-sm btn-outline btn-accent">
              View Department →
            </span>
          </div>
        </div>
      </a>

      <!-- Card 2: Timeline C -->
      <a
        href="/products/timeline"
        class="card bg-base-100 shadow-xl border-2 border-transparent hover:border-secondary transition-all duration-300 hover:-translate-y-1 group"
      >
        <div class="card-body">
          <h2
            class="card-title text-3xl text-secondary group-hover:text-primary transition-colors"
          >
            Timeline C
          </h2>
          <p class="font-bold text-base-content/90">Reality Stabilization</p>
          <p class="text-base-content/70 mt-2">
            Escape the bugs of Timeline A. Purchase access passes to the stable
            build of reality.
          </p>
          <div class="card-actions justify-end mt-4">
            <span class="btn btn-sm btn-outline btn-secondary">
              View Department →
            </span>
          </div>
        </div>
      </a>
    </div>
  </div>
</section>
