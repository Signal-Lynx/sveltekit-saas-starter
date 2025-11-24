<script lang="ts">
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { fade } from "svelte/transition"

  // Redirect timing (12s) and derived countdown seconds
  const REDIRECT_MS = 12_000
  const COUNTDOWN_START = Math.ceil(REDIRECT_MS / 1000)

  // UI state
  let secondsRemaining = $state(COUNTDOWN_START)
  let reduceMotion = $state(false)
  let noRedirect = $state(false)
  let hasRedirected = $state(false)

  // Timer handles
  let redirectTimer: number | null = null
  let countdownTimer: number | null = null
  let mql: MediaQueryList | null = null

  // Safe redirect helper
  async function goNow(): Promise<void> {
    if (hasRedirected) return
    hasRedirected = true
    if (redirectTimer !== null) clearTimeout(redirectTimer)
    if (countdownTimer !== null) clearInterval(countdownTimer)

    try {
      // invalidateAll tells SvelteKit to refetch all data, ensuring the
      // user's new entitlements are loaded fresh from the server.
      await goto("/account", { invalidateAll: true })
    } catch {
      // If navigation fails for some reason, allow another attempt.
      hasRedirected = false
    }
  }

  onMount(() => {
    // Respect user's reduced-motion preference
    mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    const applyReduced = () => (reduceMotion = !!mql?.matches)
    applyReduced()
    mql?.addEventListener?.("change", applyReduced)

    // Optional QA switch: skip auto-redirect if ?noRedirect=1 is in the URL
    noRedirect =
      new URL(window.location.href).searchParams.get("noRedirect") === "1"

    if (!noRedirect) {
      // Start the visual countdown timer
      countdownTimer = window.setInterval(() => {
        secondsRemaining = Math.max(0, secondsRemaining - 1)
      }, 1_000)

      // Set the main timer for the automatic redirect
      redirectTimer = window.setTimeout(() => {
        void goNow()
      }, REDIRECT_MS)
    }

    // Cleanup timers and event listeners when the component is unmounted
    return () => {
      if (redirectTimer !== null) clearTimeout(redirectTimer)
      if (countdownTimer !== null) clearInterval(countdownTimer)
      mql?.removeEventListener?.("change", applyReduced)
    }
  })
</script>

<svelte:head>
  <title>Purchase Successful! Preparing Your Arsenal...</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="hero min-h-screen bg-base-100" transition:fade>
  <div class="hero-content text-center">
    <div class="max-w-md mx-auto">
      <h1 class="text-3xl font-bold text-success">Payment Confirmed!</h1>

      <p class="py-4 text-xl">
        We're preparing your new arsenal. This will just take a moment...
      </p>

      <!-- Animation area -->
      <div class="my-6">
        <video
          src="/videos/arsenal-provisioning.mp4"
          width="250"
          muted
          preload="metadata"
          class="mx-auto rounded-lg"
          autoplay={!reduceMotion}
          loop={!reduceMotion}
          controls={reduceMotion}
          playsinline
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <!-- Status + countdown (ARIA live region for assistive tech) -->
      <p class="text-base-content/70" aria-live="polite">
        {#if noRedirect}
          Setup complete. You can continue to your dashboard when ready.
        {:else if secondsRemaining > 0}
          Please wait while we generate your licenses. Redirecting in {secondsRemaining}s…
        {:else}
          Finalizing… redirecting now.
        {/if}
      </p>

      <!-- Manual escape hatch -->
      <div class="mt-6 flex items-center justify-center gap-3">
        {#if noRedirect || secondsRemaining === 0}
          <!-- FIX: This button now only appears when the countdown is done or if redirects are disabled -->
          <button
            class="btn btn-sm btn-primary"
            onclick={goNow}
            disabled={hasRedirected}
            aria-label="Go to your account now"
          >
            Go now
          </button>
        {/if}

        <noscript>
          <a class="btn btn-sm btn-outline" href="/account">Go now</a>
        </noscript>
      </div>
    </div>
  </div>
</div>
