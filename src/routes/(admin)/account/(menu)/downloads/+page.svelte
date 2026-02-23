<!-- FILE: src/routes/(admin)/account/(menu)/downloads/+page.svelte -->
<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { page } from "$app/stores"
  import { enhance } from "$app/forms"
  import type { LMEntitlement } from "$lib/types"
  import type { R2File } from "$lib/server/r2"

  // ---- Context / section marker
  const adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("downloads")

  // ---- Props (Svelte 5 runes)
  const { data } = $props<{
    data: {
      entitlements: {
        hoverboard: boolean
        timeline_c: boolean
      }
      licensesByProduct: {
        hoverboard: LMEntitlement[]
        timeline_c: LMEntitlement[]
      }

      // Files from R2
      filesByProduct: {
        hoverboard: R2File[]
        timeline_c: R2File[]
      }

      subscriptionState: { lmError?: string | null }
      profile?: { is_beta_tester?: boolean | null } | null

      // public READMEs
      readmeUrls: {
        hoverboard: string | null
        timeline_c: string | null
      }
    }
  }>()

  // Narrow + safe defaults (Reactive)
  const entitlements = $derived(
    (data?.entitlements ?? {
      hoverboard: false,
      timeline_c: false,
    }) as { hoverboard: boolean; timeline_c: boolean },
  )

  const licensesByProduct = $derived(
    (data?.licensesByProduct ?? {
      hoverboard: [],
      timeline_c: [],
    }) as {
      hoverboard: LMEntitlement[]
      timeline_c: LMEntitlement[]
    },
  )

  const subscriptionState = $derived(
    (data?.subscriptionState ?? {}) as {
      lmError?: string | null
    },
  )

  type ProductKey = "hoverboard" | "timeline_c"
  type ProductConfig = {
    name: string
    subtitle: string
    description: string
  }

  const products: Record<ProductKey, ProductConfig> = {
    hoverboard: {
      name: "Hover Conversion Kit",
      subtitle: "Schematics & Decals",
      description:
        "Everything you need to void your skateboard's warranty. Includes PDF manual and printable assets.",
    },
    timeline_c: {
      name: "Timeline C Access",
      subtitle: "Reality Patch v3.0",
      description:
        "The stable build of reality. Includes access to the Zero-G Lounge and priority support.",
    },
  } as const

  // ---- Helpers

  function readmeHref(which: ProductKey): string {
    const fallbacks: Record<ProductKey, string> = {
      hoverboard: "/products/hover",
      timeline_c: "/products/timeline",
    }
    const m = data?.readmeUrls
    if (!m) return fallbacks[which]
    if (which === "hoverboard") return m.hoverboard ?? fallbacks.hoverboard
    if (which === "timeline_c") return m.timeline_c ?? fallbacks.timeline_c
    return fallbacks[which]
  }

  function fmtDate(input?: string | number | Date | null): string {
    if (!input) return ""
    try {
      const d = new Date(input)
      if (Number.isNaN(d.getTime())) return ""
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d)
    } catch {
      return ""
    }
  }

  function stableLicenseKey(lic: LMEntitlement, i: number): string {
    const base =
      lic?.license_key ||
      `${lic?.status ?? "unknown"}-${lic?.renews_at ?? lic?.trial_ends_at ?? "n/a"}`
    return `${base}-${i}`
  }

  async function copyToClipboard(text?: string | null) {
    if (!text) return
    try {
      await navigator.clipboard?.writeText(text)
      copiedKey = text
    } catch {
      // Fallback for older browsers
      try {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.setAttribute("readonly", "")
        ta.style.position = "absolute"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
        copiedKey = text
      } catch (err) {
        console.error("Failed to copy: ", err)
      }
    } finally {
      if (copiedKey) setTimeout(() => (copiedKey = null), 2000)
    }
  }

  // ---- Local state
  let copiedKey = $state<string | null>(null)
  let refreshing = $state(false)

  // ---- Enhance handler
  type EnhanceEnd = {
    update: (opts?: {
      invalidateAll?: boolean
      reset?: boolean
    }) => Promise<void> | void
  }

  const handleRefresh = () => {
    return async ({ update }: EnhanceEnd) => {
      try {
        refreshing = true
        await update({ invalidateAll: true })
      } finally {
        refreshing = false
      }
    }
  }
</script>

<svelte:head>
  <title>Your Arsenal - Paradox Innovations</title>
</svelte:head>

<!-- Header + refresh form -->
<div
  class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-2"
>
  <div>
    <h1 class="text-3xl font-bold text-primary">Digital Arsenal</h1>
    <p class="mt-2 text-lg">
      Access your downloads and license keys. Don't share these with timeline A.
    </p>
  </div>

  <form
    method="POST"
    action="?/refresh"
    use:enhance={handleRefresh}
    class="sm:self-start"
  >
    <button
      type="submit"
      class="btn btn-outline btn-sm w-full sm:w-auto"
      aria-live="polite"
      aria-busy={refreshing}
      disabled={refreshing}
    >
      {#if refreshing}
        <span class="loading loading-spinner loading-xs mr-2"></span>Syncing...
      {:else}
        Sync Licenses
      {/if}
    </button>
  </form>
</div>

{#if $page.url.searchParams.has("refreshed")}
  <div role="alert" class="alert alert-success mt-4">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="stroke-current shrink-0 h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      /></svg
    >
    <span>Sync complete. Your keys are up to date.</span>
  </div>
{/if}

{#if subscriptionState?.lmError}
  <div role="alert" class="alert alert-warning mt-6">
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
        Your access is safe, but we can't display your downloads and license
        keys at the moment. Please try again shortly.
      </div>
    </div>
    <div>
      <button
        class="btn btn-sm"
        onclick={() => {
          if (typeof window !== "undefined") window.location.reload()
        }}>Retry</button
      >
    </div>
  </div>
{/if}

<div class="mt-8 space-y-6">
  <!-- Hoverboard Section -->
  {#if entitlements.hoverboard}
    <div class="card bg-base-200 shadow-xl">
      <div class="card-body">
        <div class="md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="card-title text-2xl text-secondary">
              {products.hoverboard.name}
            </h2>
            <p class="font-semibold text-accent -mt-1">
              {products.hoverboard.subtitle}
            </p>
            <p class="mt-2 text-base-content/80 max-w-lg">
              {products.hoverboard.description}
            </p>
          </div>
          <div
            class="card-actions justify-start md:justify-end mt-4 md:mt-0 md:pl-4 flex-wrap gap-2"
          >
            <a
              href={readmeHref("hoverboard")}
              target="_blank"
              rel="noopener noreferrer external"
              class="btn btn-primary btn-gradient-electric"
            >
              Read Schematics
            </a>
            {#each data.filesByProduct.hoverboard as file (file.key)}
              <a
                href={file.url}
                rel="external"
                class="btn btn-primary btn-gradient-electric"
                >Download {file.name}</a
              >
            {/each}
          </div>
        </div>

        {#if licensesByProduct.hoverboard?.length > 0}
          <div class="divider my-4 text-accent font-semibold">License Keys</div>
          <div class="space-y-4">
            {#each licensesByProduct.hoverboard as license, i (stableLicenseKey(license, i))}
              <div>
                <div class="">
                  <div class="join w-full">
                    <input
                      type="text"
                      readonly
                      value={license?.license_key ?? ""}
                      class="input join-item w-full font-mono text-sm"
                      autocomplete="off"
                      spellcheck="false"
                      aria-label="License key"
                    />
                    <button
                      type="button"
                      class="btn join-item"
                      onclick={() => copyToClipboard(license?.license_key)}
                      aria-live="polite"
                    >
                      {#if copiedKey === license?.license_key}Copied!{:else}Copy{/if}
                    </button>
                  </div>
                </div>

                <div
                  class="pl-1 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-base-content/80"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-secondary">Status:</span>
                    <span
                      class="badge font-bold"
                      class:badge-success={license?.status === "active" ||
                        license?.status === "trial"}
                      class:badge-info={license?.status === "developer"}
                      class:badge-warning={license?.status === "blocked" ||
                        license?.status === "inactive"}
                    >
                      {license?.status}
                    </span>
                  </div>

                  {#if license?.status === "active" && license?.renews_at}
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-secondary">Renews:</span>
                      <span
                        class="font-mono text-accent"
                        title={new Date(license.renews_at).toISOString()}
                      >
                        {fmtDate(license.renews_at)}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Timeline C Section -->
  {#if entitlements.timeline_c}
    <div class="card bg-base-200 shadow-xl">
      <div class="card-body">
        <div class="md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="card-title text-2xl text-secondary">
              {products.timeline_c.name}
            </h2>
            <p class="font-semibold text-accent -mt-1">
              {products.timeline_c.subtitle}
            </p>
            <p class="mt-2 text-base-content/80 max-w-lg">
              {products.timeline_c.description}
            </p>
          </div>
          <div
            class="card-actions justify-start md:justify-end mt-4 md:mt-0 md:pl-4 flex-wrap gap-2"
          >
            <a
              href={readmeHref("timeline_c")}
              target="_blank"
              rel="noopener noreferrer external"
              class="btn btn-primary btn-gradient-electric"
            >
              Access Portal
            </a>
            {#each data.filesByProduct.timeline_c as file (file.key)}
              <a
                href={file.url}
                rel="external"
                class="btn btn-primary btn-gradient-electric"
                >Download {file.name}</a
              >
            {/each}
          </div>
        </div>

        {#if licensesByProduct.timeline_c?.length > 0}
          <div class="divider my-4 text-accent font-semibold">Access Keys</div>
          <div class="space-y-4">
            {#each licensesByProduct.timeline_c as license, i (stableLicenseKey(license, i))}
              <div>
                <div class="">
                  <div class="join w-full">
                    <input
                      type="text"
                      readonly
                      value={license?.license_key ?? ""}
                      class="input join-item w-full font-mono text-sm"
                      autocomplete="off"
                      spellcheck="false"
                      aria-label="License key"
                    />
                    <button
                      type="button"
                      class="btn join-item"
                      onclick={() => copyToClipboard(license?.license_key)}
                      aria-live="polite"
                    >
                      {#if copiedKey === license?.license_key}Copied!{:else}Copy{/if}
                    </button>
                  </div>
                </div>

                <div
                  class="pl-1 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-base-content/80"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-secondary">Status:</span>
                    <span
                      class="badge font-bold"
                      class:badge-success={license?.status === "active" ||
                        license?.status === "trial"}
                      class:badge-info={license?.status === "developer"}
                      class:badge-warning={license?.status === "blocked" ||
                        license?.status === "inactive"}
                    >
                      {license?.status}
                    </span>
                  </div>

                  {#if license?.status === "active" && license?.renews_at}
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-secondary">Renews:</span>
                      <span
                        class="font-mono text-accent"
                        title={new Date(license.renews_at).toISOString()}
                      >
                        {fmtDate(license.renews_at)}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !entitlements.hoverboard && !entitlements.timeline_c}
    <div class="card bg-base-200 shadow-xl border-2 border-accent">
      <div class="card-body text-center items-center">
        <h2 class="card-title text-3xl text-secondary">
          Your Arsenal is Empty
        </h2>
        <p class="max-w-md my-4">
          You have not acquired any schematics or subscriptions yet.
        </p>
        <div class="card-actions">
          <a
            href="/account/billing"
            class="btn btn-primary btn-lg btn-gradient-electric"
            >Choose Your Arsenal</a
          >
        </div>
      </div>
    </div>
  {/if}

  <!-- Beta Area -->
  {#if data?.profile?.is_beta_tester}
    <div class="card bg-accent text-accent-content shadow-xl my-8">
      <div class="card-body">
        <h2 class="card-title">VIP Beta Access</h2>
        <p>You have clearance for the experimental wing.</p>
        <div class="card-actions justify-end">
          <a href="/account/downloads/beta" class="btn">Enter Beta Area</a>
        </div>
      </div>
    </div>
  {/if}
</div>
