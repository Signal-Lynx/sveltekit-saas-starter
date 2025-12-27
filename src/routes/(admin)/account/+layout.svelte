<script lang="ts">
  /**
   * Layout wrapper for the /account section.
   * Receives a `children` snippet (Svelte 5) from the router and renders it.
   * No client-side logic or side effects are required here.
   */
  interface Props {
    children?: import("svelte").Snippet
  }

  // Strongly-typed props; we simply render the provided child snippet.
  const { children }: Props = $props()
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div>
  <!-- Render the child layout/page when present -->
  {@render children?.()}
</div>
