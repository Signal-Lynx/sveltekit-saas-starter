<!-- FILE: src/routes/(admin)/account/(menu)/reset-machine-id/+page.svelte -->
<script lang="ts">
  import { getContext } from "svelte"
  import { enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import type { Writable } from "svelte/store"
  import { badgeClassForStatus } from "$lib/ui/badge"
  import type { LMEntitlement } from "$lib/types"
  import { browser } from "$app/environment"
  import { SITE_CONFIG, WebsiteName } from "../../../../../config"

  const adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("reset-machine-id")

  type LicenseRow = LMEntitlement & { product_name: string }

  const { data, form } = $props() as {
    data: {
      entitlements: LMEntitlement[]
      licenses: LicenseRow[]
      lmError?: string | null
    }
    form?: any
  }

  const lmError = $derived(data?.lmError ?? null)
  const mailtoHref = `mailto:${SITE_CONFIG.machineResetEmail}`

  function retryNow() {
    if (browser) window.location.reload()
  }

  // Per-row loading flags and cooldowns (keyed by license_key)
  const busy: Record<string, boolean> = $state({})
  const cooldowns: Record<string, string | null> = $state({})

  // If server responded with a single-row cooldown update, cache it
  $effect(() => {
    const lk = form?.licenseKey as string | undefined
    if (lk && "nextAllowedAt" in (form ?? {})) {
      cooldowns[lk] = form?.nextAllowedAt ?? null
    }
  })

  function fmtDate(s?: string | null) {
    if (!s) return null
    const d = new Date(s)
    if (isNaN(+d)) return null
    return d.toLocaleString()
  }

  function msUntil(s?: string | null) {
    if (!s) return 0
    const d = new Date(s).getTime()
    return Math.max(0, d - Date.now())
  }

  function humanUntil(s?: string | null) {
    const ms = msUntil(s)
    if (ms <= 0) return "now"
    const m = Math.floor(ms / 60000)
    const d = Math.floor(m / (60 * 24))
    const h = Math.floor((m % (60 * 24)) / 60)
    const mm = m % 60
    return d > 0 ? `${d}d ${h}h ${mm}m` : h > 0 ? `${h}h ${mm}m` : `${mm}m`
  }

  // create a per-row callback for enhance()
  function makeSubmit(licenseKey: string): SubmitFunction {
    return () => {
      busy[licenseKey] = true
      return async ({ update }) => {
        try {
          await update({ reset: false })
        } finally {
          busy[licenseKey] = false
        }
      }
    }
  }
</script>

<svelte:head>
  <title>Reset Machine ID - {WebsiteName}</title>
</svelte:head>

<!-- NEW: Error Banner -->
{#if lmError}
  <div role="alert" class="alert alert-warning mb-6">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="stroke-current shrink-0 h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      /></svg
    >
    <div>
      <h3 class="font-bold">License Server Unavailable</h3>
      <div class="text-sm">
        We can't display your licenses right now. Please try again in a moment.
      </div>
    </div>
    <button class="btn btn-sm" onclick={retryNow}>Retry</button>
  </div>
{/if}

<!-- Page header (matches Dashboard/Arsenal spacing/colors) -->
<div class="mb-6">
  <h1 class="text-3xl md:text-4xl font-semibold tracking-tight text-primary">
    Machine ID Reset
  </h1>
  <p class="mt-2 text-sm md:text-base text-base-content/70 max-w-3xl">
    Resetting clears all existing machine activations for a license so you can
    activate on a new computer. Self-service resets are limited to <b
      >once every 30 days</b
    > per license.
  </p>
</div>

<!-- Card container aligned with app palette -->
<div class="card w-full bg-base-100 border border-base-300 shadow-sm">
  <div class="card-body p-5 md:p-6">
    {#if (data.licenses ?? []).length > 0}
      <ul class="divide-y divide-base-300/70">
        {#each data.licenses as e (e.license_key)}
          {#if e.status === "active" || e.status === "trial" || e.status === "developer"}
            <li class="py-4">
              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div
                      class="font-medium text-base md:text-lg text-base-content"
                    >
                      {e.product_name || "Licensed Product"}
                    </div>
                    <div class="mt-0.5 text-xs md:text-sm text-base-content/70">
                      License:
                      <code
                        class="px-1 py-0.5 rounded bg-base-200/70 text-base-content/80 font-mono text-xs"
                      >
                        {e.license_key}
                      </code>
                    </div>

                    {#if cooldowns[e.license_key] || e.next_allowed_reset_at}
                      <div class="mt-1 text-xs text-base-content/60">
                        Next eligible:
                        {#if fmtDate(cooldowns[e.license_key] || e.next_allowed_reset_at)}
                          {fmtDate(
                            cooldowns[e.license_key] || e.next_allowed_reset_at,
                          )}
                          (<span class="font-medium text-base-content/70"
                            >{humanUntil(
                              cooldowns[e.license_key] ||
                                e.next_allowed_reset_at,
                            )}</span
                          >)
                        {:else}
                          Unknown
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <span
                    class="badge {badgeClassForStatus(
                      e.status,
                    )} badge-sm md:badge-md capitalize"
                  >
                    {e.status}
                  </span>
                </div>

                <!-- Row actions -->
                <div class="flex flex-wrap items-center gap-2 mt-1.5">
                  <!-- Reset form -->
                  <form
                    method="POST"
                    action="?/reset"
                    use:enhance={makeSubmit(e.license_key)}
                    class="inline-flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="licenseKey"
                      value={e.license_key}
                    />
                    <button
                      type="submit"
                      class="btn btn-primary btn-sm md:btn-md btn-gradient-electric"
                      disabled={busy[e.license_key] ||
                        msUntil(
                          cooldowns[e.license_key] || e.next_allowed_reset_at,
                        ) > 0}
                      onclick={(ev) => {
                        const name = e.product_name ?? "this license"
                        if (
                          !confirm(
                            `Reset activations for\n${name}?\n\nThis can be done once every 30 days.`,
                          )
                        ) {
                          ev.preventDefault()
                        }
                      }}
                    >
                      {#if busy[e.license_key]}
                        <span class="loading loading-spinner"></span>
                        Processing…
                      {:else}
                        Reset Machine ID
                      {/if}
                    </button>
                  </form>

                  <!-- Ticket form -->
                  <form
                    method="POST"
                    action="?/requestManual"
                    use:enhance={makeSubmit(e.license_key)}
                    class="inline-flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="licenseKey"
                      value={e.license_key}
                    />
                    <button
                      type="submit"
                      class="btn btn-ghost btn-sm md:btn-md text-primary"
                      disabled={busy[e.license_key]}
                      title="Ask support for an early reset if you’re within the 30-day cooldown"
                    >
                      Request early reset
                    </button>
                  </form>
                </div>

                <!-- Per-row success/error feedback -->
                {#if form?.licenseKey === e.license_key}
                  {#if form?.success}
                    <div role="alert" class="alert alert-success mt-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="stroke-current shrink-0 h-5 w-5 md:h-6 md:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span
                        >{form.message ??
                          "Machine activations were reset successfully."}</span
                      >
                    </div>
                  {:else if form?.error}
                    <div role="alert" class="alert alert-error mt-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="stroke-current shrink-0 h-5 w-5 md:h-6 md:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                      </svg>
                      <span>{form.error}</span>
                    </div>
                  {:else if form?.ticket}
                    <div
                      role="alert"
                      class="alert mt-2 bg-base-200 text-base-content"
                    >
                      <span
                        >We’ve sent your early-reset request to support. We’ll
                        follow up by email.</span
                      >
                    </div>
                  {/if}
                {/if}
              </div>
            </li>
          {/if}
        {/each}
      </ul>
    {:else}
      <p class="text-base-content/70">No entitled licenses detected.</p>
    {/if}

    <div class="mt-4 text-xs md:text-sm text-base-content/70">
      Need another reset inside 30 days? Click <b>Request early reset</b> next
      to that license, or contact support at
      <a class="link link-hover text-primary" href={mailtoHref}
        >{SITE_CONFIG.machineResetEmail}</a
      >.
    </div>
  </div>
</div>
