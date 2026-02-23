<script lang="ts">
  import { displayProducts as allProducts } from "$lib/data/products"

  // Extend to accept current product fields used on homepage
  type Plan = {
    id: string
    name?: string | null
    title: string
    tagline?: string | null
    features?: string[] | null
    price: string | number
    footnote?: string | null
    stripe_price_id?: string | null
    ctaLabel?: string | null
  }

  interface Props {
    callToAction?: string
    ctaClass?: string
  }

  const { callToAction = "Select Plan", ctaClass = "" }: Props = $props()

  const products: readonly Plan[] = (allProducts ?? []) as Plan[]

  const planHref = (plan: Plan): string =>
    plan.stripe_price_id
      ? `/account/subscribe/${plan.stripe_price_id}`
      : "/login"

  const planCtaLabel = (plan: Plan): string =>
    (callToAction && callToAction.trim()) || plan.ctaLabel || "Select Plan"

  const ctaAriaLabel = (plan: Plan): string =>
    `${planCtaLabel(plan)} for ${plan.name ?? plan.title}`
</script>

<!-- Align container width/padding with homepage -->
<div class="max-w-7xl mx-auto px-4">
  <div
    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
    role="list"
    aria-label="Available plans"
  >
    {#each products as plan (plan.id)}
      <article
        role="listitem"
        aria-labelledby={`plan-${plan.id}-title`}
        class="card bg-base-200 shadow-xl h-full w-full border-4 border-transparent transition-all duration-300 hover:border-accent"
      >
        <div class="card-body p-8 flex flex-col">
          <!-- Header: show product name (primary) + title (subtitle) like homepage -->
          <div class="text-center">
            {#if plan.name}
              <h2
                id={`plan-${plan.id}-title`}
                class="card-title justify-center text-2xl font-bold text-secondary"
              >
                {plan.name}
              </h2>
              <h3 class="mt-1 text-lg font-normal text-accent">{plan.title}</h3>
            {:else}
              <h2
                id={`plan-${plan.id}-title`}
                class="card-title justify-center text-2xl font-bold text-secondary"
              >
                {plan.title}
              </h2>
            {/if}
          </div>

          {#if plan.tagline}
            <p class="text-base-content/80 mt-4">{plan.tagline}</p>
          {/if}

          <!-- Feature list -->
          <ul class="my-6 space-y-3 text-left grow">
            {#each plan.features ?? [] as feature, i (feature + i)}
              <li class="flex items-start gap-3">
                <svg
                  class="w-6 h-6 text-success shrink-0 mt-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z"
                    fill="currentColor"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            {/each}
          </ul>

          <!-- Price + CTA + footnote (match homepage) -->
          <div class="mt-auto pt-4">
            <p class="text-5xl font-bold text-center">{plan.price}</p>
            <div class="card-actions justify-center mt-6">
              <a
                href={planHref(plan)}
                class={`btn btn-primary btn-wide ${ctaClass}`}
                aria-label={ctaAriaLabel(plan)}
                onclick={(e) => e.stopPropagation()}
              >
                {planCtaLabel(plan)}
              </a>
            </div>
            {#if plan.footnote}
              <p class="text-center text-xs text-base-content/50 mt-2">
                {plan.footnote}
              </p>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>
