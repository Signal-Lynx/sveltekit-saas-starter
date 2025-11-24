<script lang="ts">
  import { onMount, onDestroy } from "svelte"

  let portalUrl: string = ""
  let errorMessage: string = ""
  let isLoading = true

  let controller: AbortController | null = null

  type PortalResponse = {
    url?: string
    error?: string
    // allow unknowns without failing parsing
    [key: string]: unknown
  }

  async function openPortal(): Promise<void> {
    // reset UI state for a fresh attempt
    isLoading = true
    errorMessage = ""
    portalUrl = ""

    // cancel any in-flight request
    controller?.abort()
    controller = new AbortController()

    try {
      const response = await fetch("/account/subscription/portal", {
        method: "POST",
        headers: { accept: "application/json" },
        signal: controller.signal,
        // credentials default is "same-origin" in browsers, but we leave it implicit to avoid changing behavior
      })

      let data: PortalResponse = {}
      try {
        data = await response.json()
      } catch {
        // Non-JSON response; fall back to generic error handling below
        data = {}
      }

      if (response.ok && data.url && typeof data.url === "string") {
        portalUrl = data.url
        // Keep same semantics as original code (href assignment)
        window.location.href = data.url
        return
      }

      // Prefer server-provided message when present
      errorMessage =
        (typeof data.error === "string" && data.error) ||
        "Failed to open the billing portal. Please try again or contact support."
    } catch (err: unknown) {
      // Ignore aborts triggered by unmounts or manual retries
      if ((err as { name?: string })?.name === "AbortError") return

      errorMessage =
        "An unexpected error occurred. Please check your connection and try again."
    } finally {
      // If a redirect happened, this won't be visible; otherwise we show the error state
      isLoading = false
    }
  }

  function retry(): void {
    void openPortal()
  }

  onMount(() => {
    void openPortal()
  })

  onDestroy(() => {
    controller?.abort()
  })
</script>

<svelte:head>
  <title>Manage Subscription | Signal Lynx</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="hero min-h-[70vh] bg-base-100">
  <div class="hero-content text-center">
    <div class="card bg-base-200 shadow-xl p-8 max-w-lg">
      <h1 class="text-2xl font-bold text-primary">
        Manage Subscription & Billing
      </h1>

      {#if isLoading}
        <p role="status" aria-live="polite" class="mt-4">
          Redirecting you to our secure billing portal...
        </p>
        <span
          class="loading loading-spinner loading-lg mt-4"
          aria-label="Loading"
        ></span>
      {:else if errorMessage}
        <div class="alert alert-error mt-4" role="alert">
          <span>{errorMessage}</span>
        </div>
        <div class="mt-6 flex items-center justify-center gap-3">
          <button class="btn btn-outline" on:click={retry}>Try again</button>
          <a href="/account/billing" class="btn btn-primary"
            >Return to Billing</a
          >
        </div>
      {:else if portalUrl}
        <p class="mt-4">
          If you are not automatically redirected, please click the button
          below.
        </p>
        <a href={portalUrl} class="btn btn-primary btn-lg mt-6"
          >Open Billing Portal</a
        >
      {/if}

      <noscript>
        <div class="alert alert-warning mt-6">
          <p>
            JavaScript is required to open the secure billing portal. Please
            enable JavaScript and reload this page.
          </p>
        </div>
      </noscript>
    </div>
  </div>
</div>
