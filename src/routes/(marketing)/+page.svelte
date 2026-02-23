<!-- FILE: src/routes/(marketing)/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { goto } from "$app/navigation"
  import {
    WebsiteName,
    WebsiteBaseUrl,
    WebsiteDescription,
  } from "./../../config"
  import type { Product } from "$lib/data/products"
  import { featureShowcase } from "$lib/data/homepageFeatures"

  // Data comes from +page.server.ts
  const { data } = $props() as { data: { products: Product[] } }

  // Use derived to sort safely without stale closure warnings
  const allProducts = $derived.by(() => {
    const products = Array.isArray(data?.products) ? data.products : []
    // Optional: Add custom sorting here if needed, otherwise just pass through
    return products
  })

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: WebsiteName,
    url: WebsiteBaseUrl,
    description: WebsiteDescription,
  }
  const jsonldScript = `<script type="application/ld+json">${
    JSON.stringify(ldJson) + "<"
  }/script>`

  let scrollContainer: HTMLElement
  let cards: HTMLElement[] = []
  let currentCardIndex = 0
  let scrollInterval: ReturnType<typeof setInterval>

  function scrollToCard(index: number) {
    if (!scrollContainer || !cards.length) return
    const card = cards[index]
    const firstCard = cards[0]
    if (!card || !firstCard) return
    const targetScrollLeft = card.offsetLeft - firstCard.offsetLeft
    scrollContainer.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    })
    currentCardIndex = index
  }

  function advanceCarousel(direction: "forward" | "backward") {
    if (!cards.length) return
    let nextIndex = currentCardIndex
    if (direction === "forward") {
      nextIndex = (currentCardIndex + 1) % cards.length
    } else {
      nextIndex = (currentCardIndex - 1 + cards.length) % cards.length
    }
    scrollToCard(nextIndex)
  }

  function handleManualScroll(direction: "forward" | "backward") {
    clearInterval(scrollInterval)
    advanceCarousel(direction)
    startAutoScroll()
  }

  function startAutoScroll() {
    scrollInterval = setInterval(() => {
      advanceCarousel("forward")
    }, 5000)
  }

  onMount(() => {
    startAutoScroll()
    const pause = () => clearInterval(scrollInterval)
    const resume = () => startAutoScroll()

    setTimeout(() => {
      if (scrollContainer) {
        cards = Array.from(scrollContainer.querySelectorAll(".feature-card"))

        // Desktop hover pause/resume
        scrollContainer.addEventListener("mouseenter", pause)
        scrollContainer.addEventListener("mouseleave", resume)

        // Mobile touch pause/resume
        scrollContainer.addEventListener("touchstart", pause, { passive: true })
        scrollContainer.addEventListener("touchend", resume, { passive: true })
        scrollContainer.addEventListener("touchcancel", resume, {
          passive: true,
        })
      }
    }, 0)
  })

  onDestroy(() => {
    clearInterval(scrollInterval)
  })
</script>

<svelte:head>
  <title>{WebsiteName}: {WebsiteDescription}</title>
  <meta name="description" content={WebsiteDescription} />
  {@html jsonldScript}
</svelte:head>

<!-- Hero Section (CSS Only - No Images Required) -->
<div class="hero min-h-[65vh] bg-base-200 relative overflow-hidden">
  <!-- Abstract Background Elements -->
  <div
    class="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none"
  >
    <div
      class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary blur-[120px]"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary blur-[120px]"
    ></div>
  </div>

  <div class="hero-content text-center relative z-10">
    <div class="max-w-4xl">
      <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
        Solving Tomorrow's Problems
        <span
          class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent"
        >
          By Causing Them Today.
        </span>
      </h1>
      <p
        class="py-6 text-xl md:text-2xl text-base-content/80 max-w-2xl mx-auto"
      >
        Welcome to <strong class="text-primary">{WebsiteName}</strong>. We
        specialize in theoretical physics, dubious engineering, and SvelteKit
        templates that deploy faster than light.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center mt-4">
        <a
          href="#experiments"
          class="btn btn-primary btn-lg btn-gradient-electric"
        >
          Browse Experiments
        </a>
        <a
          href="https://github.com/Signal-Lynx/sveltekit-saas-starter"
          target="_blank"
          class="btn btn-outline btn-lg"
        >
          View Source Code
        </a>
      </div>
    </div>
  </div>
</div>

<!-- Trust Bar (Scientific / Lab Theme) -->
<div class="bg-base-100 py-16 border-b border-base-200">
  <div
    class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center px-4"
  >
    <!-- Feature 1 -->
    <div class="flex flex-col items-center">
      <div
        class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4 text-secondary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      </div>
      <h4 class="font-bold text-xl">Lab Tested</h4>
      <p class="text-base-content/70 mt-2">
        Every line of code has been irradiated, centrifuged, and peer-reviewed
        by beings from the future.
      </p>
    </div>

    <!-- Feature 2 -->
    <div class="flex flex-col items-center">
      <div
        class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4 text-secondary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h4 class="font-bold text-xl">Infinite Scalability</h4>
      <p class="text-base-content/70 mt-2">
        Our backend runs on Key Commander, Supabase and Stripe. It scales
        infinitely, unlike our intern's patience.
      </p>
    </div>

    <!-- Feature 3 -->
    <div class="flex flex-col items-center">
      <div
        class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4 text-secondary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h4 class="font-bold text-xl">Timeline Insurance</h4>
      <p class="text-base-content/70 mt-2">
        Self-hosted means you own your data. If the timeline resets, your
        database stays with you.
      </p>
    </div>
  </div>
</div>

<!-- Product Cards Section -->
<div id="experiments" class="py-20 bg-base-200">
  <div class="max-w-4xl mx-auto text-center mb-16 px-4">
    <h2 class="text-4xl font-bold text-primary mb-4">Current Experiments</h2>
    <p class="text-xl text-base-content/80">
      Select a prototype. Sign the waiver. Enjoy the ride.
    </p>
  </div>

  <div
    class="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-4 justify-center items-stretch"
  >
    {#each allProducts as product (product.id)}
      <div
        class="card bg-base-100 shadow-xl flex-1 flex flex-col min-w-[300px] max-w-[450px] border border-base-300 transition-all duration-300 hover:border-primary hover:shadow-2xl group cursor-pointer"
        role="link"
        tabindex="0"
        aria-label={`Open ${product.name} page`}
        onclick={() => goto(product.href)}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") goto(product.href)
        }}
      >
        <div class="card-body p-8 flex flex-col">
          <div class="text-center mb-6">
            <h2
              class="text-2xl font-bold text-secondary group-hover:text-primary transition-colors"
            >
              {product.name}
            </h2>
            <h3
              class="text-sm font-bold text-accent tracking-widest uppercase mt-2"
            >
              {product.title}
            </h3>
          </div>

          <p class="text-base-content/80 mb-6 text-center italic">
            "{product.tagline}"
          </p>

          <ul class="space-y-3 text-left grow mb-8">
            {#each product.features as feature}
              <li class="flex items-start gap-3">
                <svg
                  class="w-5 h-5 text-success shrink-0 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm">{feature}</span>
              </li>
            {/each}
          </ul>

          <div class="mt-auto pt-4 border-t border-base-200">
            <p class="text-4xl font-bold text-center mb-6">{product.price}</p>
            <button class="btn btn-primary w-full btn-gradient-electric">
              {product.ctaLabel}
            </button>
            <p class="text-center text-xs text-base-content/50 mt-3">
              {product.footnote}
            </p>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Manifesto Section -->
<div class="py-20 bg-base-100">
  <div class="max-w-4xl mx-auto px-4 text-center">
    <h2 class="text-3xl md:text-5xl font-bold text-primary mb-12">
      Why we built this lab.
    </h2>
    <div class="space-y-12 text-lg text-base-content/80 text-left">
      <div class="flex gap-6">
        <div class="text-4xl">🧪</div>
        <div>
          <h3 class="font-bold text-2xl text-white mb-2">
            Because starting from scratch sucks.
          </h3>
          <p>
            You have a great idea (like a hoverboard). You shouldn't spend 3
            weeks configuring user authentication and Stripe webhooks before you
            even draw the first schematic. Signal Lynx Key Commander, coupled
            with this template, handles the boring stuff.
          </p>
        </div>
      </div>

      <div class="flex gap-6">
        <div class="text-4xl">☢️</div>
        <div>
          <h3 class="font-bold text-2xl text-white mb-2">
            We believe in dangerous ideas.
          </h3>
          <p>
            Safe ideas are boring. We want you to build the thing that might
            accidentally create a black hole. Or at least a profitable
            MicroSaaS. The <strong>Key Commander</strong> backend keeps your licenses
            secure while you break the laws of physics.
          </p>
        </div>
      </div>

      <div class="flex gap-6">
        <div class="text-4xl">🧬</div>
        <div>
          <h3 class="font-bold text-2xl text-white mb-2">
            Evolution, not revolution.
          </h3>
          <p>
            You don't need to rewrite the universe. You just need to fork it.
            Clone this repo, change the hex codes in <code>theme.ts</code>, and
            you're legally a distinct entity in the eyes of the intergalactic
            council.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Feature Carousel -->
<div class="py-20 bg-base-200 overflow-hidden relative">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-3xl font-bold text-center mb-12">
      <span class="text-primary">Lab Capabilities</span> (Features)
    </h2>

    <div class="relative group">
      <!-- Left Button -->
      <button
        onclick={() => handleManualScroll("backward")}
        class="btn btn-circle btn-neutral absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous">❮</button
      >

      <div
        bind:this={scrollContainer}
        class="flex space-x-6 overflow-x-auto px-4 pb-8 hide-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {#each featureShowcase as feature}
          <div
            class="feature-card bg-base-100 p-8 rounded-xl w-80 md:w-96 flex-none shadow-lg border border-base-300 snap-center flex flex-col"
          >
            <h3 class="text-xl font-bold text-secondary mb-2">
              {feature.title}
            </h3>
            <p class="text-sm text-base-content/70 mb-6 min-h-12">
              {feature.description}
            </p>
            <ul class="space-y-3 mt-auto">
              {#each feature.details as detail}
                <li
                  class="flex items-center gap-2 text-sm font-mono text-accent"
                >
                  <span>></span>
                  {detail}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>

      <!-- Right Button -->
      <button
        onclick={() => handleManualScroll("forward")}
        class="btn btn-circle btn-neutral absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next">❯</button
      >
    </div>
  </div>
</div>

<!-- Tech Stack (Replaces "Integrations") -->
<div class="py-16 bg-base-100 border-t border-base-200">
  <div class="max-w-5xl mx-auto text-center px-4">
    <h2 class="text-2xl font-bold text-secondary mb-8">
      Powered by Unstable Isotopes & Solid Code
    </h2>

    <div
      class="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
    >
      <!-- Placeholder Logos (Text fallback since we deleted images) -->
      <div class="flex items-center gap-2">
        <span class="text-2xl font-bold">SvelteKit</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl font-bold">Supabase</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl font-bold">Stripe</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl font-bold">Tailwind</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl font-bold">DaisyUI</span>
      </div>
    </div>

    <!-- GIANT KEY COMMANDER LINK -->
    <div class="mt-24 pt-12 border-t border-base-content/10">
      <p class="text-sm font-bold tracking-widest text-accent uppercase mb-4">
        Orchestrated By
      </p>
      <a
        href="https://signallynx.com"
        target="_blank"
        rel="noopener noreferrer"
        class="group block"
      >
        <h2
          class="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-secondary via-primary to-accent opacity-90 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-[1.02]"
        >
          KEY COMMANDER
        </h2>
        <div
          class="flex items-center justify-center gap-2 mt-4 text-base-content/60 group-hover:text-primary transition-colors"
        >
          <span>Visit SignalLynx.com</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            /></svg
          >
        </div>
      </a>
    </div>
  </div>
</div>

<!-- CTA -->
<section class="bg-base-200 py-20 text-center px-4 relative overflow-hidden">
  <div class="max-w-3xl mx-auto relative z-10">
    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
      Ready to Open the Portal?
    </h2>
    <p class="text-xl mb-8 text-base-content/80">
      Clone the repo. Configure your env. Launch your SaaS before the timeline
      destabilizes.
    </p>
    <a
      href="https://github.com/Signal-Lynx/sveltekit-saas-starter"
      target="_blank"
      class="btn btn-primary btn-lg btn-wide btn-gradient-electric"
    >
      Get the Code
    </a>
  </div>
</section>

<style>
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
