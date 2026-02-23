<!-- src/routes/(admin)/account/(menu)/downloads/beta/+page.svelte (FINAL CORRECTED VERSION) -->
<script lang="ts">
  import { enhance } from "$app/forms"
  import { slide } from "svelte/transition"
  import { tick } from "svelte"
  import type { BetaProduct } from "$lib/data/beta_products"
  import { WebsiteName } from "../../../../../../config"

  // --- Types ---
  interface FormActionResult {
    success?: boolean
    error?: string
    productId?: string
  }

  type Status = "ineligible" | "locked" | "unlocked"

  interface PageServerData {
    productsWithStatus: (BetaProduct & {
      status: Status
      hasProductionLicense: boolean
    })[]
    subscriptionState?: {
      ownedProductIds: string[]
    }
  }

  // --- Props ---
  const {
    data,
    form,
  }: {
    data: PageServerData
    form?: FormActionResult
  } = $props()

  // --- State ---
  const loadingById = $state<Record<string, boolean>>({})

  // --- Helpers ---
  const isLoadingFor = (id: string) => Boolean(loadingById[id])
  const setLoadingFor = (id: string, v: boolean) => (loadingById[id] = v)
  const errorFor = (id: string) =>
    form?.productId === id && form?.error ? form.error : null

  type UpdateFn = (options?: {
    reset?: boolean
    invalidateAll?: boolean
  }) => Promise<void>
</script>

<svelte:head>
  <title>Beta Arsenal - {WebsiteName}</title>
</svelte:head>

<h1 class="text-3xl font-bold text-primary">Beta Arsenal</h1>
<p class="mt-2 text-lg text-accent">
  Experimental builds, straight from the lab. Present your credentials to unlock
  and claim your licenses.
</p>

<noscript>
  <div class="alert alert-warning mt-6">
    JavaScript is disabled. Forms will still submit, but you won’t see inline
    updates.
  </div>
</noscript>

<div class="mt-8 space-y-8">
  {#each data.productsWithStatus as product (product.id)}
    <div
      class="card bg-base-200 shadow-xl border-2"
      class:border-success={product.status === "unlocked"}
      class:border-transparent={product.status !== "unlocked"}
      data-testid={`beta-card-${product.id}`}
    >
      <div class="card-body">
        <div class="flex justify-between items-start gap-4">
          <div class="min-w-0">
            <h2 class="card-title text-2xl text-secondary wrap-break-word">
              {product.name}
            </h2>
            <p class="text-base-content/80 mt-2">{product.description}</p>
          </div>
        </div>

        <div class="card-actions justify-end mt-4">
          {#if product.status === "ineligible"}
            <div
              class="text-sm text-warning font-semibold p-4 bg-base-100 rounded-lg text-right"
            >
              Requires an active license for the corresponding production
              software to participate in this beta.
            </div>
          {:else if product.status === "locked"}
            <form
              method="POST"
              action="?/redeem"
              use:enhance={(_evt: unknown) => {
                setLoadingFor(product.id, true)
                return async ({ update }: { update: UpdateFn }) => {
                  await update()
                  setLoadingFor(product.id, false)
                  await tick()
                  if (errorFor(product.id)) {
                    const input = document.getElementById(
                      `passphrase-${product.id}`,
                    ) as HTMLInputElement | null
                    input?.focus()
                    input?.select()
                  }
                }
              }}
              class="flex flex-wrap items-end gap-2"
              aria-busy={isLoadingFor(product.id) ? "true" : "false"}
              data-testid={`redeem-form-${product.id}`}
            >
              <input type="hidden" name="productId" value={product.id} />

              <div class="">
                <label for={`passphrase-${product.id}`} class="label">
                  <span class="">Beta Passphrase</span>
                </label>
                <input
                  id={`passphrase-${product.id}`}
                  name="passphrase"
                  type="text"
                  class="input"
                  placeholder="Enter passphrase..."
                  required
                  autocomplete="off"
                  inputmode="text"
                  aria-invalid={errorFor(product.id) ? "true" : "false"}
                  aria-errormessage={errorFor(product.id)
                    ? `error-${product.id}`
                    : undefined}
                  disabled={isLoadingFor(product.id)}
                />
              </div>

              <button
                type="submit"
                class="btn btn-secondary"
                disabled={isLoadingFor(product.id)}
              >
                {#if isLoadingFor(product.id)}
                  <span class="loading loading-spinner" aria-hidden="true"
                  ></span>
                  <span class="sr-only">Redeeming…</span>
                  Redeeming...
                {:else}
                  Redeem Access
                {/if}
              </button>
            </form>
          {:else if product.status === "unlocked"}
            <a
              href={`/account/downloads/beta/${product.id}`}
              class="btn btn-primary btn-gradient-electric"
              data-testid={`view-downloads-${product.id}`}
            >
              View Downloads
            </a>
          {/if}
        </div>

        {#if errorFor(product.id)}
          <div
            id={`error-${product.id}`}
            class="alert alert-error text-sm mt-4"
            transition:slide
            role="alert"
            data-testid={`error-${product.id}`}
          >
            <span>{errorFor(product.id)}</span>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
