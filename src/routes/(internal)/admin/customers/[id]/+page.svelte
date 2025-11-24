<!-- src/routes/(internal)/admin/customers/[id]/+page.svelte -->
<script lang="ts">
  import { page } from "$app/stores"

  /** Data contracts (same shape as before, now explicit) */
  type Profile = {
    id: string
    email: string
    unsubscribed: boolean
    is_beta_tester: boolean
  }

  type Subscription = {
    status: string | null
    plan: string | null
  }

  type LicenseRow = {
    key: string
    status: string
  }

  type ProductRow = {
    id: string
    name: string
    status: string
  }

  type Summary = {
    profile: Profile
    subscription: Subscription
    licenses: LicenseRow[]
    activeProducts?: ProductRow[] // NEW (optional)
  }

  export let data: { summary: Summary }

  // Safe local refs (do not change values shown; just convenience)
  const p = data.summary.profile
  const sub = data.summary.subscription
  const licenses = data.summary.licenses
  const products = data.summary.activeProducts ?? [] // NEW

  // Derive URL param messages once for cleaner markup
  let urlError = ""
  let urlOk = ""
  let urlSent = ""
  $: urlError = $page.url.searchParams.get("error") ?? ""
  $: urlOk = $page.url.searchParams.get("ok") ?? ""
  $: urlSent = $page.url.searchParams.get("sent") ?? ""
</script>

<svelte:head>
  <title>Admin • Customer</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<!-- Toast / alerts -->
{#if urlError}
  <div role="alert" aria-live="polite" class="alert alert-error mb-4">
    Error: {urlError}
  </div>
{/if}
{#if urlOk}
  <div role="status" aria-live="polite" class="alert alert-success mb-4">
    Success: {urlOk}
  </div>
{/if}
{#if urlSent}
  <div role="status" aria-live="polite" class="alert alert-success mb-4">
    Email request queued.
  </div>
{/if}

<header class="mb-6">
  <h1 class="text-2xl font-bold mb-1">Customer Details</h1>
  <p class="text-base-content/70 break-all">{p.email} — {p.id}</p>
</header>

<div class="grid gap-4 md:grid-cols-3">
  <!-- Profile -->
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Profile</h2>
      <dl class="text-sm space-y-1">
        <div class="flex gap-2">
          <dt class="text-base-content/70">Unsubscribed:</dt>
          <dd>{p.unsubscribed ? "true" : "false"}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-base-content/70">Beta:</dt>
          <dd>{p.is_beta_tester ? "true" : "false"}</dd>
        </div>
      </dl>
      <div class="card-actions justify-start mt-2 flex-col items-start">
        <form
          method="POST"
          action="?/toggle_unsubscribed"
          autocomplete="off"
          novalidate
        >
          <button
            type="submit"
            class="btn btn-sm btn-outline"
            aria-label="Toggle unsubscribe"
          >
            Toggle Unsubscribe
          </button>
        </form>
        {#if p.is_beta_tester}
          <form method="POST" action="?/set_beta" autocomplete="off" novalidate>
            <button
              type="submit"
              class="btn btn-sm btn-outline"
              name="enable"
              value="false"
              aria-label="Revoke beta access"
            >
              Revoke Beta
            </button>
          </form>
        {:else}
          <form method="POST" action="?/set_beta" autocomplete="off" novalidate>
            <button
              type="submit"
              class="btn btn-sm btn-outline"
              name="enable"
              value="true"
              aria-label="Grant beta access"
            >
              Grant Beta
            </button>
          </form>
        {/if}
      </div>
    </div>
  </section>

  <!-- Subscription -->
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Subscription</h2>
      <dl class="text-sm space-y-1">
        <div class="flex gap-2">
          <dt class="text-base-content/70">Status:</dt>
          <dd>{sub.status ?? "-"}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-base-content/70">Plan:</dt>
          <dd>{sub.plan ?? "-"}</dd>
        </div>
      </dl>

      <div class="card-actions justify-start mt-2">
        <a
          href={`/admin/customers/${encodeURIComponent(p.id)}/billing-portal`}
          class="btn btn-sm btn-outline"
          aria-label="Open billing portal"
          rel="external"
        >
          Open Billing Portal
        </a>
      </div>
    </div>
  </section>

  <section class="card bg-base-200 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Products</h2>

      {#if products.length}
        <ul class="list-disc list-inside text-sm">
          {#each products as p}
            <li>{p.name} — {p.status}</li>
          {/each}
        </ul>
      {:else}
        <p class="text-base-content/70 text-sm">No active products</p>
      {/if}
    </div>
  </section>

  <!-- Licenses -->
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Licenses</h2>

      {#if licenses.length}
        <ul class="list-disc list-inside text-sm break-all">
          {#each licenses as lic}
            <li><code>{lic.key}</code> — {lic.status}</li>
          {/each}
        </ul>
      {:else}
        <p class="text-base-content/70 text-sm">No licenses</p>
      {/if}

      <div class="mt-4">
        <form
          method="POST"
          action="?/reset_machine_id"
          class="mt-2"
          autocomplete="off"
          novalidate
        >
          <button
            type="submit"
            class="btn btn-sm btn-outline"
            aria-label="Reset ALL machine IDs for this user"
            title="Forces re-activation on next launch for all products/licenses"
          >
            Reset ALL Machine IDs
          </button>
          <p class="text-xs text-base-content/70 mt-2">
            Forces re-activation on next launch across all products/licenses for
            this user.
          </p>
        </form>
      </div>
    </div>
  </section>
</div>

<!-- Email -->
<section class="mt-4 card bg-base-200 shadow-sm">
  <div class="card-body">
    <h2 class="card-title">Send Email</h2>

    <form
      method="POST"
      action="?/send_email"
      class="space-y-2"
      autocomplete="off"
      novalidate
    >
      <input
        name="subject"
        placeholder="Subject"
        class="input input-bordered w-full"
        aria-label="Email subject"
        required
      />
      <textarea
        name="body"
        class="textarea textarea-bordered w-full"
        rows="6"
        aria-label="Email body"
        placeholder="Type a short message to the user…"
        required
        maxlength="4000"
      ></textarea>
      <button type="submit" class="btn btn-outline">Send</button>
    </form>
  </div>
</section>
