<!-- src/routes/(internal)/admin/customers/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms"
  import type { ActionResult } from "@sveltejs/kit"

  // Incoming props from SvelteKit
  export let data: { results: Array<{ id: string; email: string }> }
  export let form: {
    results?: Array<{ id: string; email: string }>
    error?: string
  } | null

  type Row = { id: string; email: string }

  // Local state
  let query = ""
  let isSubmitting = false
  let clientError = ""
  let resultsContainer: HTMLDivElement | null = null

  // Prefer the latest action result; fall back to initial data
  let results: Row[] = data.results
  $: results = form?.results ?? data.results

  // Keep param untyped to match whatever SvelteKit version you're on
  const onEnhance = (input: any) => {
    const { formData, cancel } = input as {
      formData: FormData
      cancel: () => void
    }

    clientError = ""
    isSubmitting = true

    // Trim the email field before submitting; if empty, cancel submit
    const raw = formData.get("email")
    if (typeof raw === "string") {
      const trimmed = raw.trim()
      formData.set("email", trimmed)
      query = trimmed
      if (!trimmed) {
        isSubmitting = false
        cancel()
        // Keep server behavior (empty email => empty results) and show a friendly hint
        clientError = "Please enter an email before searching."
        return
      }
    }

    // Post-submit lifecycle
    return async ({
      result,
      update,
    }: {
      result: ActionResult
      update: (opts?: { invalidateAll?: boolean }) => Promise<void>
    }) => {
      try {
        await update() // updates the `form` store -> our `$: results` reacts
        if (result.type === "error") {
          clientError = "Search failed. Please try again."
        }
        // Shift focus to results for accessibility
        queueMicrotask(() => resultsContainer?.focus())
      } catch {
        clientError = "Network error. Please try again."
      } finally {
        isSubmitting = false
      }
    }
  }
</script>

<h1 class="text-2xl font-semibold mb-4">Customers</h1>

<form
  method="POST"
  action="?/search"
  use:enhance={onEnhance}
  class="flex flex-col sm:flex-row gap-2 mb-6"
  aria-busy={isSubmitting}
>
  <input
    name="email"
    type="search"
    placeholder="Search by email"
    class="input input-bordered w-full"
    autocomplete="off"
    spellcheck="false"
    bind:value={query}
    aria-label="Search customers by email"
  />
  <button
    class="btn btn-neutral disabled:opacity-60 w-full sm:w-auto"
    disabled={isSubmitting}
  >
    {#if isSubmitting}Searching…{/if}
    {#if !isSubmitting}Search{/if}
  </button>
</form>

{#if clientError}
  <div
    role="alert"
    class="mb-4 rounded border alert alert-error px-3 py-2 text-sm"
  >
    {clientError}
  </div>
{/if}

{#if results?.length}
  <div
    class="space-y-2 outline-none"
    tabindex="-1"
    bind:this={resultsContainer}
    aria-live="polite"
  >
    {#each results as r}
      <a
        class="btn btn-outline btn-sm w-full justify-start text-left font-normal normal-case items-start whitespace-normal break-words h-auto"
        href={"/admin/customers/" + r.id}
        data-sveltekit-preload-data="hover"
      >
        {r.email} <span class="text-base-content/70 ml-2">({r.id})</span>
      </a>
    {/each}
  </div>
{:else}
  <div class="text-base-content/70">No results yet.</div>
{/if}
