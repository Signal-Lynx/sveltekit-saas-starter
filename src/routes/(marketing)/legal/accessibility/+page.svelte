<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG } from "../../../../config"

  let showContact = $state(false)
</script>

<ContentPage title="Accessibility">
  <p>
    We aim to conform to <strong
      >Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong
    > and improve accessibility over time.
  </p>
  <p>
    If you encounter an accessibility barrier, please contact us at
    {#if showContact}
      <a href={`mailto:${SITE_CONFIG.supportEmail}`}
        >{SITE_CONFIG.supportEmail}</a
      >
    {:else}
      <button
        class="btn btn-xs btn-ghost text-primary underline decoration-dashed underline-offset-4"
        onclick={() => (showContact = true)}
        title="Click to reveal email"
      >
        Click to view
      </button>
    {/if}
    with the page URL and a description of the issue.
  </p>
</ContentPage>
