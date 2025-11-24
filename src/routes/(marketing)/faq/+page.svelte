<script lang="ts">
  import { generalFaqs, hoverFaqs, timelineFaqs } from "$lib/data/faqData"
  import { WebsiteName } from "../../../config"
</script>

<svelte:head>
  <title>FAQ – {WebsiteName}</title>
  <meta
    name="description"
    content="Frequently Asked Questions for Paradox Innovations. Real template help + in-universe answers."
  />
</svelte:head>

<div class="py-12 px-4 bg-base-100">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold text-primary">
        Knowledge Base
      </h1>
      <p class="mt-4 text-xl max-w-2xl mx-auto text-base-content/80">
        Answers to your burning questions. Both the serious ones about the code,
        and the concerning ones about the space-time continuum.
      </p>
    </div>

    <!-- General / Template Help -->
    <h2 class="text-3xl font-bold text-secondary mb-6">
      General Dossier: Template Intel
    </h2>
    <div class="join join-vertical w-full mb-16">
      {#each generalFaqs as faq, i}
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="faq-general" checked={i === 0} />
          <div class="collapse-title text-xl font-medium">
            {faq.question}
          </div>
          <div class="collapse-content text-base-content/80">
            {@html faq.answer}
          </div>
        </div>
      {/each}
    </div>

    <!-- Hover Tech -->
    <h2 class="text-3xl font-bold text-secondary mb-6">Dossier: Hover Tech</h2>
    <div class="join join-vertical w-full mb-16">
      {#each hoverFaqs as faq, i}
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="faq-hover" checked={i === 0} />
          <div class="collapse-title text-xl font-medium">
            {faq.question}
          </div>
          <div class="collapse-content text-base-content/80">
            {@html faq.answer}
          </div>
        </div>
      {/each}
    </div>

    <!-- Timeline C -->
    <h2 class="text-3xl font-bold text-secondary mb-6">Dossier: Timeline C</h2>
    <div class="join join-vertical w-full">
      {#each timelineFaqs as faq, i}
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="faq-timeline" checked={i === 0} />
          <div class="collapse-title text-xl font-medium">
            {faq.question}
          </div>
          <div class="collapse-content text-base-content/80">
            {@html faq.answer}
          </div>
        </div>
      {/each}
    </div>

    <!-- Contact Section -->
    <div class="text-center mt-16 pt-8 border-t border-base-200">
      <h2 class="text-2xl font-bold">Still Stumped?</h2>
      <p class="mt-2 max-w-xl mx-auto mb-6">
        If it's about the template, contact Signal Lynx. If it's about a
        temporal paradox, please remain calm and wait for the enforcement team.
      </p>
      <a href="/contact_us" class="btn btn-primary btn-gradient-electric"
        >Open Comms</a
      >
    </div>
  </div>
</div>
