<script lang="ts">
  import type { Product } from "$lib/data/products"

  // Props
  const { product }: { product: Product } = $props()

  // Helpers
  // Fix: Use $derived.by to prevent "state_referenced_locally" warnings and ensure reactivity
  const isEmphasized = $derived.by(
    () => product?.id === "antigrav" || product?.id === "timeline_c",
  )

  const subscribeHref = $derived.by(() =>
    product?.stripe_price_id
      ? `/account/subscribe/${product.stripe_price_id}`
      : "/login",
  )

  const headingId = $derived.by(
    () => `product-heading-${product?.id ?? "item"}`,
  )
  const footnoteId = $derived.by(
    () => `product-footnote-${product?.id ?? "item"}`,
  )
</script>

<div
  role="region"
  aria-labelledby={headingId}
  data-product-id={product.id}
  class="card bg-base-100 w-full lg:w-1/2 flex-none shadow-xl border-2 transition-all duration-300 hover:shadow-2xl"
  class:border-primary={isEmphasized}
  class:border-base-300={!isEmphasized}
>
  <div class="card-body p-8 flex flex-col">
    <h3
      id={headingId}
      class="card-title text-2xl text-secondary justify-center"
    >
      {product.name}
    </h3>

    <p
      class="text-sm font-bold text-accent text-center uppercase tracking-wide mb-4"
    >
      {product.title}
    </p>

    <p class="text-base-content/80 grow text-center italic mb-6">
      "{product.tagline}"
    </p>

    {#if product?.features && product.features.length > 0}
      <ul class="space-y-3 text-left mb-8">
        {#each product.features as feature (feature)}
          <li class="flex items-start gap-3 text-sm">
            <svg
              class="w-5 h-5 text-success shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>{feature}</span>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="mt-auto pt-6 border-t border-base-200">
      <p class="text-4xl font-bold text-center mb-6">{product.price}</p>

      <div class="card-actions justify-center">
        <a
          href={subscribeHref}
          class="btn btn-primary btn-wide btn-gradient-electric"
          aria-label={`${product.ctaLabel} – ${product.title}`}
          aria-describedby={product.footnote ? footnoteId : undefined}
          data-price-id={product.stripe_price_id}
        >
          {product.ctaLabel}
        </a>
      </div>

      {#if product.footnote}
        <p
          id={footnoteId}
          class="text-center text-xs text-base-content/50 mt-3"
        >
          {product.footnote}
        </p>
      {/if}
    </div>
  </div>
</div>
