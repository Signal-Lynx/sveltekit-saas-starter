<!-- src/routes/(marketing)/access/+page.svelte -->
<script lang="ts">
  import { page } from "$app/stores"
  import { enhance } from "$app/forms"

  // ----- Types -----
  type GateKind = "site" | "purchase"
  type ActionData = { error?: string } | null

  // `form` comes from the action result
  const { form }: { form: ActionData } = $props()
  let isLoading = $state(false)

  // ----- Gate selection (reactive to URL changes) -----
  function asGateKind(raw: string | null): GateKind {
    return raw?.toLowerCase() === "purchase" ? "purchase" : "site"
  }

  const gateType = $derived(asGateKind($page.url.searchParams.get("gate")))

  const gateInfo: Record<GateKind, { title: string; prompt: string }> = {
    site: {
      title: "Pre-Flight Clearance Required",
      prompt:
        "We know you love the smell of jet fuel in the morning, but the tower hasn't cleared us to go hot. If you've got clearance, present your credentials below. Otherwise, comms are dark for now—check back soon.",
    },
    purchase: {
      title: "Beta Arsenal Access",
      prompt:
        "The quartermaster requires authentication before releasing experimental hardware. This gear is for vetted operators only. Present the beta access passphrase to proceed with your acquisition.",
    },
  }

  const info = $derived(gateInfo[gateType])

  // ----- A11y focus management for errors -----
  let errorEl = $state<HTMLDivElement | null>(null)
  $effect(() => {
    if (form?.error && errorEl) errorEl.focus()
  })
</script>

<svelte:head>
  <title>{info.title}</title>
  <meta name="robots" content="noindex" />
  <meta
    name="description"
    content="Enter passphrase to proceed. Signal Lynx gated access."
  />
</svelte:head>

<div class="hero min-h-screen bg-base-100">
  <div class="hero-content text-center">
    <div class="card w-full max-w-lg bg-base-200 shadow-xl">
      <div class="card-body items-center">
        <!-- Main Logo -->
        <img
          src="/images/SignalLynxHomePageBanner.png"
          alt="Signal Lynx Logo"
          class="h-50 w-auto mb-4"
          width="600"
          height="120"
          loading="lazy"
          decoding="async"
        />

        <h1 class="text-3xl font-bold text-primary">{info.title}</h1>
        <p class="py-4 text-base-content/80">{info.prompt}</p>

        <form
          method="POST"
          aria-busy={isLoading}
          class="space-y-4 w-full max-w-sm"
          use:enhance={({ cancel, formElement }) => {
            isLoading = true
            return async ({ update }) => {
              try {
                await update()
              } catch {
                // Fall back to a normal submission on client-side failure
                cancel()
                formElement.submit()
              } finally {
                isLoading = false
              }
            }
          }}
        >
          <!-- Critical: pass through selected gate to the action -->
          <input type="hidden" name="gateType" value={gateType} />

          <div class="form-control w-full text-left">
            <label for="password" class="label">
              <span class="label-text">Access Passphrase</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              spellcheck="false"
              autocomplete="current-password"
              class="input input-bordered w-full"
              placeholder="Present Credentials."
              aria-invalid={Boolean(form?.error)}
              aria-describedby={form?.error ? "password-error" : undefined}
              required
            />
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

        <div class="divider my-6">What's on the other side?</div>
        <p class="text-sm text-base-content/70">
          A full suite of local-first, security-obsessed automation tools for
          builders and traders.
          <br />
          <strong>Your keys, your server, your rules.</strong>
        </p>

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
