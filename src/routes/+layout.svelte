<!-- src/routes/+layout.svelte -->
<script module lang="ts">
  // Ambient declarations must live in the module script.
  declare global {
    interface Window {
      dataLayer: unknown[]
      gtag?: (
        command: "config" | "js",
        targetIdOrDate: string | Date,
        config?: { page_path?: string; send_page_view?: boolean },
      ) => void
    }
  }
</script>

<script lang="ts">
  import "../app.css"
  import { navigating, page } from "$app/stores"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  import { browser, dev } from "$app/environment"
  import type { Snippet } from "svelte"
  import { onMount } from "svelte"

  // ---- Children snippet from router ----
  const { children }: { children?: Snippet } = $props()

  // ---- Browser error listeners (client-only) ----
  onMount(() => {
    // Universal error reporter for the browser
    const reportClientError = (error: any) => {
      const message = (error?.message ?? String(error)) as string

      // Ignore noisy/low-signal errors (extensions, common DOM blockers, etc.)
      if (
        message.includes("ResizeObserver") ||
        message.includes("Extension context invalidated") ||
        message.includes("not readable")
      ) {
        return
      }

      // Prefer sendBeacon to avoid blocking navigations/unloads
      try {
        const payload = JSON.stringify({
          message,
          stack: error?.stack,
        })

        if ("sendBeacon" in navigator) {
          navigator.sendBeacon("/api/report-error", payload)
        } else {
          // Fallback: fire-and-forget fetch
          fetch("/api/report-error", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // Handle circular structures or serialization failures
        try {
          const fallbackPayload = JSON.stringify({
            message,
            stack: "Could not serialize stack trace.",
          })
          if ("sendBeacon" in navigator) {
            navigator.sendBeacon("/api/report-error", fallbackPayload)
          } else {
            fetch("/api/report-error", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: fallbackPayload,
              keepalive: true,
            }).catch(() => {})
          }
        } catch {
          // last-resort: swallow
        }
      }
    }

    // drop browser-extension + MetaMask noise before reporting
    function shouldIgnoreClientError(
      payload: unknown,
      evt?: ErrorEvent | PromiseRejectionEvent,
    ): boolean {
      const asAny = payload as any
      const msg =
        typeof payload === "string" ? payload : (asAny?.message as string) || ""
      const stack = (asAny?.stack as string) || ""
      const filename =
        (evt && "filename" in evt ? (evt as ErrorEvent).filename : "") || ""

      // 1) Anything coming from extensions
      if (filename.startsWith("chrome-extension://")) return true
      if (
        msg.includes("chrome-extension://") ||
        stack.includes("chrome-extension://")
      )
        return true

      // 2) MetaMask-specific chatter (common on non-dapp sites)
      if (/metamask/i.test(msg) || /inpage\.js/i.test(stack)) return true
      if (/Failed to connect to MetaMask/i.test(msg)) return true

      // 3) Other known browser noise you may want to ignore
      if (/ResizeObserver loop limit exceeded/i.test(msg)) return true

      return false
    }

    const errorHandler = (event: ErrorEvent) => {
      const payload = event?.error ?? event?.message ?? event
      if (shouldIgnoreClientError(payload, event)) return
      reportClientError(payload)
    }

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const payload = event?.reason ?? "Unhandled promise rejection"
      if (shouldIgnoreClientError(payload, event)) return
      reportClientError(payload)
    }

    window.addEventListener("error", errorHandler)
    window.addEventListener("unhandledrejection", rejectionHandler)

    // Cleanup
    return () => {
      window.removeEventListener("error", errorHandler)
      window.removeEventListener("unhandledrejection", rejectionHandler)
    }
  })

  // ---- Google Analytics (client-only) ----
  const GA_MEASUREMENT_ID = "G-YOUR_MEASUREMENT_ID_HERE" as string
  const ENABLE_GA =
    !dev &&
    GA_MEASUREMENT_ID !== "G-YOUR_MEASUREMENT_ID_HERE" &&
    GA_MEASUREMENT_ID.startsWith("G-")

  // Send page_view on each path change after GA bootstraps (send_page_view: false initially).
  $effect(() => {
    if (!ENABLE_GA || !browser) return
    const pathname = $page.url.pathname
    window.gtag?.("config", GA_MEASUREMENT_ID, { page_path: pathname })
  })

  // ---- Respect reduced motion for the progress bar ----
  let prefersReducedMotion = false
  if (browser && "matchMedia" in window) {
    prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
  }
  const progressDuration = prefersReducedMotion ? 0 : 2000
</script>

<svelte:head>
  {#if ENABLE_GA}
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    ></script>
    <script>
      {
        ;`
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        // Initialize GA but do NOT auto-send the first page_view
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
      `
      }
    </script>
  {/if}
</svelte:head>

{#if $navigating}
  <div
    aria-hidden="true"
    class="fixed w-full top-0 right-0 left-0 h-1 z-50 bg-primary"
    in:slide={{
      delay: 100,
      duration: progressDuration,
      axis: "x",
      easing: expoOut,
    }}
  ></div>
{/if}

<!-- Always render children; server hooks handle gating/redirects. -->
{#if children}
  {@render children()}
{/if}
