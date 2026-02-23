<!-- src/routes/(marketing)/access/+page.svelte -->
<script lang="ts">
  import { page } from "$app/stores"
  import { SITE_CONFIG } from "../../config"
  import { enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"

  // ----- Types -----
  type GateKind = "site" | "purchase"
  type ActionData = { error?: string } | null

  // form comes from the action result
  const { form }: { form: ActionData } = $props()

  let isLoading = $state(false)
  let showPassword = $state(false)

  // ----- Gate selection (reactive to URL changes) -----
  function asGateKind(raw: string | null): GateKind {
    return raw?.toLowerCase() === "purchase" ? "purchase" : "site"
  }

  const gateType = $derived(asGateKind($page.url.searchParams.get("gate")))

  const gateInfo: Record<GateKind, { title: string; prompt: string }> = {
    site: {
      title: "Restricted Access",
      prompt: `This site is currently in private preview mode.
        <br/>
        Please enter the access passphrase to continue.`,
    },
    purchase: {
      title: "Beta Purchase Access",
      prompt:
        "This product is currently in limited beta. Authentication is required before you can proceed to checkout.",
    },
  }

  const info = $derived(gateInfo[gateType])

  // ----- A11y focus management for errors -----
  let errorEl = $state<HTMLDivElement | null>(null)

  $effect(() => {
    if (form?.error && errorEl) errorEl.focus()
  })

  // ----- Submit Handler -----
  const handleSubmit: SubmitFunction = () => {
    isLoading = true

    return async ({ result, update }) => {
      // 1. Let SvelteKit apply the result (this handles the redirect navigation)
      await update()

      // 2. Only stop loading if it failed.
      // If it succeeded (Redirect), we want to KEEP the spinner spinning
      // until the page actually navigates away.
      if (result.type === "failure" || result.type === "error") {
        isLoading = false
      }
    }
  }
</script>

<svelte:head>
  <title>{info.title}</title>
  <meta name="robots" content="noindex" />
  <meta
    name="description"
    content="Enter passphrase to proceed. Gated access."
  />
</svelte:head>

<div class="hero min-h-screen bg-base-100">
  <div class="hero-content text-center">
    <div class="card w-full max-w-lg bg-base-200 shadow-xl">
      <div class="card-body items-center">
        <!-- Main Logo -->
        <img
          src={SITE_CONFIG.logoPath}
          alt={SITE_CONFIG.logoAlt}
          class="h-24 w-auto mb-4 object-contain"
          width="96"
          height="96"
        />

        <h1 class="text-3xl md:text-4xl font-bold text-primary leading-tight">
          {info.title}
        </h1>

        <!-- Render as HTML to support the specific line breaks -->
        <p class="py-4 text-base-content/80 text-lg leading-relaxed">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html info.prompt}
        </p>

        <form
          method="POST"
          aria-busy={isLoading}
          class="space-y-4 w-full max-w-sm"
          use:enhance={handleSubmit}
        >
          <!-- Critical: pass through selected gate to the action -->
          <input type="hidden" name="gateType" value={gateType} />

          <div class="w-full text-left">
            <label for="password" class="label">
              <span class="">Access Passphrase</span>
            </label>
            <div class="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                spellcheck="false"
                autocomplete="current-password"
                class="input w-full pr-14"
                placeholder="Enter passphrase..."
                aria-invalid={Boolean(form?.error)}
                aria-describedby={form?.error ? "password-error" : undefined}
                required
              />
              <button
                type="button"
                class="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/70"
                onclick={() => (showPassword = !showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {#if form?.error}
            <div
              id="password-error"
              role="alert"
              class="alert alert-error text-sm"
              tabindex="-1"
              bind:this={errorEl}
              aria-live="assertive"
            >
              {form.error}
            </div>
          {/if}

          <!-- Live region for loading status (polite so it doesn't interrupt errors) -->
          <div class="sr-only" aria-live="polite">
            {#if isLoading}Verifying credentials...{/if}
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-gradient-electric w-full"
            disabled={isLoading}
          >
            {#if isLoading}
              <span
                class="loading loading-spinner"
                role="status"
                aria-label="Loading"
              ></span>
              <span class="ml-2">Verifying...</span>
            {:else}
              Authenticate
            {/if}
          </button>
        </form>

        <!-- Social Links Grid -->
        <div class="mt-8 w-full border-t border-base-content/10 pt-6">
          <p
            class="text-xs uppercase tracking-widest text-base-content/50 mb-4 font-bold"
          >
            Stay Updated
          </p>
          <div class="grid grid-cols-2 gap-4">
            <!-- Link 1 (GitHub / Telegram placeholder) -->
            <a
              href={SITE_CONFIG.socials[0]?.href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              class="group flex flex-col items-center gap-2 p-3 rounded-xl bg-base-100 hover:bg-base-300 transition-all duration-200 border border-base-content/5 hover:border-primary/30"
            >
              <span
                class="text-sm font-bold text-secondary text-center leading-tight"
              >
                {SITE_CONFIG.socials[0]?.name ?? "Community"}
              </span>
            </a>

            <!-- Link 2 (Twitter / X placeholder) -->
            <a
              href={SITE_CONFIG.socials[1]?.href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              class="group flex flex-col items-center gap-2 p-3 rounded-xl bg-base-100 hover:bg-base-300 transition-all duration-200 border border-base-content/5 hover:border-primary/30"
            >
              <span
                class="text-sm font-bold text-secondary text-center leading-tight"
              >
                {SITE_CONFIG.socials[1]?.name ?? "Updates"}
              </span>
            </a>
          </div>
        </div>

        <noscript>
          <p class="text-xs text-base-content/60 mt-4">
            JavaScript is disabled. The form will submit normally, but you won't
            see inline status updates.
          </p>
        </noscript>
      </div>
    </div>
  </div>
</div>
