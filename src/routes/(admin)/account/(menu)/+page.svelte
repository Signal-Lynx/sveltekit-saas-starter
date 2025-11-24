<!-- src/routes/(admin)/account/+page.svelte -->
<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from "./$types"
  import type { ActiveProductRow } from "$lib/server/subscription"
  import { badgeClassForStatus } from "$lib/ui/badge"
  import { browser } from "$app/environment"

  // ---- Admin section context (robust to missing context) ----
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("home")

  // ---- Typed props from SvelteKit ----
  const { data } = $props() as { data: PageData & { lmError?: string | null } }

  // Booleans & safe fallbacks
  const isActiveCustomer: boolean = data?.isActiveCustomer === true

  // Defensive normalization for products array
  const activeProducts: ActiveProductRow[] = Array.isArray(data?.activeProducts)
    ? (data!.activeProducts!.filter(Boolean) as ActiveProductRow[])
    : []

  // Friendly display name with safe trimming
  const displayName =
    data?.profile?.full_name?.trim() || data?.user?.email?.trim() || "Operator"

  const lmError = $derived(data?.lmError ?? null)

  function retryNow() {
    if (browser) window.location.reload()
  }
</script>

<svelte:head>
  <title>Operator Dashboard</title>
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
        d="M12 9v2m0 4h._svelte-docs_1m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      /></svg
    >
    <div>
      <h3 class="font-bold">License Server Unavailable</h3>
      <div class="text-sm">
        Your product information may be out of date. Your access is not
        affected.
      </div>
    </div>
    <button class="btn btn-sm" onclick={retryNow}>Retry</button>
  </div>
{/if}

<div class="mb-8">
  <h1 class="text-4xl font-bold text-primary">Operator Dashboard</h1>
  <p class="text-xl mt-2">
    Welcome back, {displayName}.
  </p>
</div>

{#if isActiveCustomer}
  <!-- ========== VIEW FOR ACTIVE SUBSCRIBERS ========== -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Subscription Status Card -->
    <div class="card bg-base-200 shadow-xl">
      <div class="card-body" aria-live="polite">
        <h2 class="card-title text-2xl text-secondary">Subscription Status</h2>

        {#if activeProducts.length > 0}
          <div class="space-y-3 mt-2">
            {#each activeProducts as product}
              <div class="flex items-center justify-between">
                <span class="text-lg font-semibold">{product?.name}</span>
                <div
                  class={`badge capitalize font-bold ${badgeClassForStatus(product?.status)}`}
                >
                  {product?.status}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-lg">No active plans found.</p>
        {/if}

        <div class="card-actions justify-start mt-4">
          <a
            href="/account/billing/manage"
            class="btn btn-primary btn-gradient-electric"
            >Manage Billing & Invoices</a
          >
        </div>
      </div>
    </div>

    <!-- Your Arsenal Card -->
    <div class="card bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl text-secondary">Your Arsenal</h2>
        <p>
          Access your licensed software, tools, and setup guides here. All
          systems are go.
        </p>
        <div class="card-actions justify-start mt-4">
          <a
            href="/account/downloads"
            class="btn btn-primary btn-gradient-electric"
            >Access Your Downloads</a
          >
        </div>
      </div>
    </div>

    <!-- Mission-Critical Links -->
    <div class="card bg-base-200 shadow-xl lg:col-span-2">
      <div class="card-body">
        <h2 class="card-title text-2xl text-secondary">
          Mission-Critical Links
        </h2>
        <p>
          Quick access to manage your profile or get support from the community.
        </p>
        <div class="card-actions justify-start mt-4 gap-4">
          <a href="/account/settings" class="btn btn-outline"
            >Adjust Operator Profile</a
          >
          <a href="/docs" class="btn btn-outline">Read the Docs</a>
          <a
            href="https://t.me/SignalLynx"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline">Join Command on Telegram</a
          >
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- ========== VIEW FOR NEW USERS (NO ACTIVE PLAN) ========== -->
  <div class="card bg-base-200 shadow-xl border-2 border-accent">
    <div class="card-body text-center items-center">
      <h2 class="card-title text-3xl text-secondary">
        Welcome to the Command Center
      </h2>
      <p class="max-w-md my-4">
        Your account is active, but you haven't deployed an arsenal yet. Select
        a plan to unlock your tools and go live.
      </p>
      <div class="card-actions">
        <a
          href="/account/select_plan"
          class="btn btn-primary btn-lg btn-gradient-electric"
          >Choose Your Arsenal</a
        >
      </div>
    </div>
  </div>

  <div class="mt-8 text-center">
    <p>
      Need to adjust your basic profile or password? <a
        href="/account/settings"
        class="link">Go to Settings</a
      >.
    </p>
  </div>
{/if}
