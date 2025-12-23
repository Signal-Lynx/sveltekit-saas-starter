<!-- src/routes/(admin)/account/(menu)/billing/+page.svelte -->
<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import PricingModule from "$lib/components/pricing_module.svelte"
  import type { ActiveProductRowWithDates } from "$lib/server/subscription"
  import { badgeClassForStatus } from "$lib/ui/badge"

  // Context is optional in practice; guard to avoid SSR/runtime errors
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("billing")

  // ---- Props (shape preserved) ----
  const { data } = $props() as {
    data: {
      isActiveCustomer: boolean
      hasEverHadSubscription: boolean
      planStatus?: string
      activeProducts: ActiveProductRowWithDates[]
      lmError?: string | null
      // server-picked copy (optional)
      bannerSlowCopy?: string
      bannerErrorCopy?: string
      // true if first LM attempt timed out but retry succeeded (optional)
      lmSlow?: boolean | null
    }
  }

  // Use $derived to ensure updates from the server reflect instantly
  const isActiveCustomer = $derived(data.isActiveCustomer)
  const hasEverHadSubscription = $derived(data.hasEverHadSubscription)
  const activeProducts = $derived(data.activeProducts ?? [])
  const lmError = $derived(data.lmError ?? null)
  const bannerSlowCopy = $derived(
    data.bannerSlowCopy ?? "Syncing your license status…",
  )
  const bannerErrorCopy = $derived(
    data.bannerErrorCopy ?? "We’re having trouble reaching the license server.",
  )
  const lmSlow = $derived(data.lmSlow ?? null)

  // --- NEW: Read checkout error from URL ---
  const checkoutError = $derived(
    $page.url.searchParams.get("error") === "checkout_unavailable",
  )
  const checkoutErrorMessage =
    "Checkout is temporarily unavailable because our licensing server is offline. Please try again in a few minutes."

  /**
   * Safe date formatter:
   * - accepts ISO string (or null/undefined)
   * - returns localized short date (e.g., "Jan 3, 2025") or null
   */
  function fmtDate(iso?: string | null): string | null {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    try {
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      // extremely old browsers or unusual locale: fallback
      return d.toISOString().slice(0, 10)
    }
  }

  function whenLabel(row: ActiveProductRowWithDates): string {
    return row.status === "trial" ? "Trial ends" : "Renews"
  }

  function kindLabel(kind: ActiveProductRowWithDates["kind"]): string {
    if (kind === "subscription") return "Subscription"
    if (kind === "included") return "Included bonus"
    return "One-time buy"
  }

  function kindBadgeClass(kind: ActiveProductRowWithDates["kind"]): string {
    // Subtle, brand-aligned chips
    if (kind === "subscription") return "badge badge-outline badge-accent"
    if (kind === "included") return "badge badge-outline badge-secondary"
    return "badge badge-outline"
  }

  function retryNow() {
    // SSR-safe reload, but also clear the error param from the URL
    if (browser) {
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.location.href = url.toString()
    }
  }

  // Small helper for each-item keys; falls back gracefully
  const keyOf = (row: ActiveProductRowWithDates, idx: number) =>
    `${row?.id ?? row?.name ?? "row"}::${idx}`
</script>

<svelte:head>
  <title>Billing Command</title>
  <meta
    name="description"
    content="Manage subscriptions, payment methods, and invoices."
  />
</svelte:head>

<h1 class="text-3xl font-extrabold text-secondary">Billing Command</h1>
<p class="text-base-content/70 mt-1">
  Manage subscriptions, payment methods, and invoices.
</p>

<!-- --- NEW: Checkout Error Banner --- -->
{#if checkoutError}
  <div
    class="alert alert-error mt-4"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >
    <span>{checkoutErrorMessage}</span>
  </div>
{/if}

{#if lmSlow && !lmError}
  <!-- Slow (but not errored) – message chosen on the server -->
  <div
    class="alert alert-info mt-4"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span>{bannerSlowCopy}</span>
    <div>
      <button
        type="button"
        class="btn btn-sm"
        onclick={retryNow}
        aria-label="Retry license sync now"
      >
        Retry now
      </button>
    </div>
  </div>
{/if}

{#if lmError}
  <!-- Warning banner, using server-picked copy + original detail -->
  <div
    class="alert alert-warning mt-4"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span
      >{bannerErrorCopy} Your access is safe, but we can't show your current products
      or allow new purchases right now.</span
    >
    <div>
      <button
        type="button"
        class="btn btn-sm"
        onclick={retryNow}
        aria-label="Retry after error"
      >
        Retry now
      </button>
    </div>
  </div>
{/if}

{#if !isActiveCustomer && !lmError}
  <div class="mt-4 mb-8">
    <p class="text-lg font-semibold text-base-content/90">
      No active products yet
    </p>
    <p class="text-base-content/70">
      Choose a plan to deploy your tools and go live.
    </p>
  </div>

  <div class="mt-8">
    <PricingModule
      callToAction="Deploy Plan"
      ctaClass="btn-gradient-electric"
    />
  </div>

  {#if hasEverHadSubscription}
    <div class="mt-10">
      <a href="/account/billing/manage" class="link">Review past invoices</a>
    </div>
  {/if}
{:else}
  <section
    class="card bg-base-200 shadow-xl mt-6"
    aria-labelledby="subscription-status-heading"
  >
    <div class="card-body">
      <h2
        id="subscription-status-heading"
        class="card-title text-2xl font-bold text-secondary"
      >
        Subscription Status
      </h2>

      {#if activeProducts && activeProducts.length > 0}
        <ul class="mt-4 space-y-4">
          {#each activeProducts as row, i (keyOf(row, i))}
            <li class="flex items-start justify-between gap-3">
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-3">
                  <span
                    class="font-semibold text-base-content truncate"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span class={kindBadgeClass(row.kind)}
                    >{kindLabel(row.kind)}</span
                  >
                </div>

                <!-- Friendly date line -->
                {#if row.status === "trial" ? fmtDate(row.trial_ends_at) : fmtDate(row.renews_at)}
                  <span class="text-sm text-base-content/70 mt-1">
                    {whenLabel(row)}:
                    {row.status === "trial"
                      ? fmtDate(row.trial_ends_at)
                      : fmtDate(row.renews_at)}
                  </span>
                {/if}
              </div>

              <span
                class="badge {badgeClassForStatus(
                  row.status,
                )} capitalize self-center"
                title={`Status: ${row.status}`}
              >
                {row.status}
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-base-content/70 mt-2">
          No active subscriptions detected.
        </p>
      {/if}

      <div class="card-actions justify-end mt-5">
        <a href="/account/billing/manage" class="btn btn-primary btn-sm">
          Manage Billing
        </a>
      </div>
    </div>
  </section>
{/if}
