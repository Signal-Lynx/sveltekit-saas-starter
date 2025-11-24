<script lang="ts">
  import type { Snippet } from "svelte"

  interface Props {
    children?: Snippet
  }

  const { children }: Props = $props()
</script>

<div
  class="text-center content-center max-w-lg mx-auto min-h-[70vh] pb-12 flex items-center place-content-center"
>
  <div class="flex flex-col w-64 lg:w-80">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
