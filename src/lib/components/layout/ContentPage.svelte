<!-- FILE: src/lib/components/layout/ContentPage.svelte  -->

<script lang="ts">
  import { WebsiteName } from "../../../config"

  interface Props {
    title: string
    description?: string
    seoTitle?: string
    seoDescription?: string
    children?: import("svelte").Snippet
  }

  const {
    title,
    description = "",
    seoTitle,
    seoDescription,
    children,
  }: Props = $props()
</script>

<svelte:head>
  <title>{seoTitle ?? title} | {WebsiteName}</title>
  {#if seoDescription ?? description}
    <meta name="description" content={seoDescription ?? description} />
  {/if}
</svelte:head>

<section class="prose max-w-3xl mx-auto px-4 py-10">
  <h1>{title}</h1>
  {@render children?.()}
</section>
