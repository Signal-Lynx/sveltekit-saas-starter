<!-- src/routes/(admin)/account/(menu)/downloads/beta/[productId]/+page.svelte (Corrected) -->
<script lang="ts">
  import type { PageData } from "./$types"

  // Data now comes directly from the server loader we created.
  const { data } = $props<{ data: PageData }>()
  const product = $derived(data.product)
  const files = $derived(data.files)
</script>

<svelte:head>
  <title>Beta Downloads for {product?.name ?? "Beta Product"}</title>
</svelte:head>

<div class="prose max-w-none">
  <a href="/account/downloads/beta" class="link no-underline">
    ← Back to Beta Arsenal
  </a>
  <h1 class="mt-4">{product?.name ?? "Beta Downloads"}</h1>
  <p>{product?.description ?? "Download your beta files below."}</p>

  {#if files.length > 0}
    <h2 class="mt-8!">Files</h2>
    <ul class="not-prose list-none p-0 space-y-2">
      {#each files as file (file.key)}
        <li>
          <a
            href={file.url}
            rel="external"
            class="btn btn-primary btn-gradient-electric"
          >
            Download {file.name}
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="alert alert-warning">
      <p>No downloads are currently available for this beta product.</p>
    </div>
  {/if}
</div>
