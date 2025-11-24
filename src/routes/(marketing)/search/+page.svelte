<script lang="ts">
  import { page } from "$app/stores"
  import { browser, dev } from "$app/environment"
  import { onMount, onDestroy } from "svelte"
  import Fuse from "fuse.js"
  import type { IFuseOptions, FuseResult, FuseIndex } from "fuse.js"
  import { goto } from "$app/navigation"

  // --- Types --------------------------------------------------------
  type SearchDoc = {
    title: string
    description: string
    body: string
    path: string
  }

  type SearchPayload = {
    index: unknown
    indexData: SearchDoc[]
  }

  // --- Fuse config (kept equivalent) --------------------------------
  const fuseOptions: IFuseOptions<SearchDoc> = {
    keys: [
      { name: "title", weight: 3 },
      { name: "description", weight: 2 },
      { name: "body", weight: 1 },
    ],
    ignoreLocation: true,
    threshold: 0.3,
  }

  // --- State --------------------------------------------------------
  let fuse: Fuse<SearchDoc> | undefined = $state()
  let results: FuseResult<SearchDoc>[] = $state([])

  // Keep initial behavior: read query from the URL hash
  let searchQuery = $state(decodeURIComponent($page.url.hash.slice(1) ?? ""))

  let loading = $state(true)
  let error = $state(false)

  // Keyboard focus index: 0 = input, 1..N = results
  let focusItem = $state(0)

  // --- Utilities ----------------------------------------------------
  const SEARCH_CACHE_KEY = "slx_search_index_v1"

  function safeFocus(id: string) {
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) el.focus()
  }

  // --- Data bootstrap (with abort + cache for robustness) -----------
  let abortCtrl: AbortController | null = null

  onMount(async () => {
    abortCtrl = new AbortController()

    try {
      // Try session cache first (skipped in dev to avoid stale data while iterating)
      let payload: SearchPayload | null = null
      if (!dev) {
        try {
          const cached = sessionStorage.getItem(SEARCH_CACHE_KEY)
          if (cached) payload = JSON.parse(cached) as SearchPayload
        } catch {
          // ignore cache parse errors
        }
      }

      if (!payload) {
        const response = await fetch("/search/api.json", {
          signal: abortCtrl.signal,
          headers: { Accept: "application/json" },
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        payload = (await response.json()) as SearchPayload

        try {
          sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(payload))
        } catch {
          /* no-op */
        }
      }

      if (payload && payload.index && payload.indexData) {
        // The serialized index shape is accepted by parseIndex; cast to any to avoid overly strict typings
        const index = Fuse.parseIndex<SearchDoc>(
          payload.index as unknown as FuseIndex<SearchDoc> | any,
        )
        fuse = new Fuse<SearchDoc>(payload.indexData, fuseOptions, index)
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        console.error("Failed to load search data", e)
        error = true
      }
    } finally {
      loading = false
      setTimeout(() => document.getElementById("search-input")?.focus(), 0)
    }
  })

  onDestroy(() => {
    abortCtrl?.abort()
    abortCtrl = null
  })

  // --- Search effect (debounced for smoother UX) --------------------
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    if (!fuse) {
      results = []
      return
    }

    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      results = searchQuery
        ? (fuse!.search(searchQuery) as FuseResult<SearchDoc>[])
        : []
      focusItem = 0
    }, 75)

    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer)
        searchTimer = null
      }
    }
  })

  // --- Keep URL hash synced with query (same behavior) --------------
  $effect(() => {
    if (browser && window.location.hash.slice(1) !== searchQuery) {
      goto("#" + searchQuery, { keepFocus: true, replaceState: true })
    }
  })

  // --- Keyboard navigation & actions --------------------------------
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      searchQuery = ""
      focusItem = 0
      safeFocus("search-input")
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const delta = event.key === "ArrowDown" ? 1 : -1
      const next = focusItem + delta
      focusItem = Math.max(0, Math.min(results.length, next))
      if (focusItem === 0) {
        safeFocus("search-input")
      } else {
        safeFocus(`search-result-${focusItem}`)
      }
      return
    }

    if (event.key === "Enter" && focusItem > 0 && focusItem <= results.length) {
      const r = results[focusItem - 1]
      const href = r?.item?.path || "/"
      if (href) window.location.href = href
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<svelte:head>
  <title>Search Terminal - Signal Lynx</title>
  <meta name="description" content="Query the Signal Lynx databanks." />
</svelte:head>

<div class="py-8 lg:py-12 px-6 max-w-2xl mx-auto">
  <div class="text-center">
    <h1 class="text-4xl md:text-6xl font-bold text-primary">Intel Terminal</h1>
    <p class="mt-2 text-lg">Query the databanks. Find what you need.</p>
  </div>

  <div class="relative mt-10 mb-5 w-full">
    <div
      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    >
      <svg
        class="h-5 w-5 text-base-content/50"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
    </div>
    <input
      id="search-input"
      type="text"
      class="input input-bordered w-full pl-10 text-lg"
      placeholder="Search..."
      bind:value={searchQuery}
      onfocus={() => (focusItem = 0)}
      aria-label="Search input"
      aria-busy={loading}
      disabled={loading || error}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  </div>

  {#if loading}
    <div
      class="text-center mt-10 text-accent text-xl animate-pulse"
      role="status"
      aria-live="polite"
    >
      Connecting to Intel Terminal...
    </div>
  {:else if error}
    <div class="text-center mt-10 text-error text-xl" role="alert">
      Error: Connection to intel terminal failed. Please try again later.
    </div>
  {:else if searchQuery.length > 0 && results.length === 0}
    <div
      class="text-center mt-10 text-accent text-xl"
      role="status"
      aria-live="polite"
    >
      No Signal Found for "{searchQuery}"
    </div>
    {#if dev}
      <div class="text-center mt-4 font-mono text-base-content/50">
        (Dev Mode: Missing content? Rebuild your local search index with <code
          >npm run build</code
        >)
      </div>
    {/if}
  {/if}

  <div class="mt-8 space-y-6">
    {#each results as result, i}
      <a
        href={result.item.path || "/"}
        id={"search-result-" + (i + 1)}
        class="card bg-base-200 shadow-lg overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:border-accent border-2 border-transparent focus:border-accent focus:outline-none"
      >
        <div class="card-body">
          <h2 class="card-title text-2xl text-secondary">
            {result.item.title}
          </h2>
          <div class="text-sm text-accent font-mono">
            PATH: {result.item.path}
          </div>
          <p class="text-base-content/80 mt-2">{result.item.description}</p>
        </div>
      </a>
    {/each}
  </div>
</div>
