<!-- FILE: src/lib/components/layout/ContentPage.svelte (NEW FILE) -->
<script lang="ts">
  import { WebsiteName } from "../../../config"

  interface Props {
    title: string
    description?: string
    children?: import("svelte").Snippet
  }

  const { title, description = "", children }: Props = $props()
</script>

<svelte:head>
  <title>{title} | {WebsiteName}</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
</svelte:head>

<section class="prose max-w-3xl mx-auto px-4 py-10">
  <h1>{title}</h1>
  {@render children?.()}
</section>
