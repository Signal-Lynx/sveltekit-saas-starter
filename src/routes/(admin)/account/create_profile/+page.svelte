<script lang="ts">
  import { applyAction, enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import { WebsiteName } from "../../../../config"

  // --- Types (kept local so we don't import anything new) ---
  interface User {
    email: string
  }

  interface Profile {
    full_name?: string
    company_name?: string
    website?: string
  }

  type FieldName = "fullName" | "companyName" | "website"

  // This mirrors what the server returns today (kept flexible)
  // If you already have a global type, this local one won’t conflict.
  interface FormAccountUpdateResult {
    errorMessage?: string
    errorFields?: string[]
    fullName?: string
    companyName?: string
    website?: string
  }

  interface Props {
    data: { user: User; profile: Profile }
    form: FormAccountUpdateResult
  }

  const { data, form }: Props = $props()
  const user = $derived(data.user)
  const profile = $derived(data.profile)

  // Local state (kept as runes for Svelte 5)
  let loading = $state(false)

  // Initial values
  const fullName = $derived(profile?.full_name ?? "")
  const companyName = $derived(profile?.company_name ?? "")
  const website = $derived(profile?.website ?? "")

  // Field error helper (same behavior, just safer typing)
  function fieldError(
    liveForm: FormAccountUpdateResult | undefined,
    name: FieldName,
  ): boolean {
    return Boolean(liveForm?.errorFields?.includes(name))
  }

  // Progressive enhancement submit (unchanged semantics, tougher error-safety)
  const handleSubmit: SubmitFunction = () => {
    loading = true
    return async ({ update, result }) => {
      try {
        await update({ reset: false })
        await applyAction(result)
      } catch (err) {
        // If navigation/redirect is thrown, SvelteKit will handle it.
        // Any other error: keep the page usable.
        console.error("Profile form submission error:", err)
      } finally {
        loading = false
      }
    }
  }
</script>

// src/routes/(admin)/account/create_profile/+page.ts
<svelte:head>
  <title>Create Your Profile - {WebsiteName}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-100 p-4">
  <div class="card w-full max-w-md bg-base-200 shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-3xl text-primary mb-2">
        Complete Your Operator Profile
      </h1>
      <p class="text-base-content/80 mb-6">
        Welcome to the command center. We just need a few more details to get
        your account fully operational.
      </p>

      <form
        class="form-widget space-y-4"
        method="POST"
        action="/account/api?/updateProfile"
        use:enhance={handleSubmit}
        novalidate
        aria-busy={loading}
      >
        <!-- Your Name -->
        <div>
          <label for="fullName" class="label">
            <span class="">Your Name</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="e.g. Jane 'Glitch' Doe"
            class="input w-full {fieldError(form, 'fullName')
              ? 'input-error'
              : ''}"
            value={form?.fullName ?? fullName}
            maxlength="50"
            autocomplete="name"
            inputmode="text"
            aria-invalid={fieldError(form, "fullName")}
            aria-describedby={fieldError(form, "fullName")
              ? "fullName-help"
              : undefined}
            data-testid="profile-fullName"
          />
          {#if fieldError(form, "fullName")}
            <div id="fullName-help" class="mt-1 text-xs text-error">
              Please check this field.
            </div>
          {/if}
        </div>

        <!-- Company / Organization -->
        <div>
          <label for="companyName" class="label">
            <span class="">Company / Organization</span>
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            placeholder="e.g. Cyberdyne Systems"
            class="input w-full {fieldError(form, 'companyName')
              ? 'input-error'
              : ''}"
            value={form?.companyName ?? companyName}
            maxlength="50"
            autocomplete="organization"
            inputmode="text"
            aria-invalid={fieldError(form, "companyName")}
            aria-describedby={fieldError(form, "companyName")
              ? "companyName-help"
              : undefined}
            data-testid="profile-companyName"
          />
          {#if fieldError(form, "companyName")}
            <div id="companyName-help" class="mt-1 text-xs text-error">
              Please check this field.
            </div>
          {/if}
        </div>

        <!-- Company Website -->
        <div>
          <label for="website" class="label">
            <span class="">Company Website</span>
          </label>
          <input
            id="website"
            name="website"
            type="text"
            placeholder="e.g. https://example.com"
            class="input w-full {fieldError(form, 'website')
              ? 'input-error'
              : ''}"
            value={form?.website ?? website}
            maxlength="50"
            autocomplete="url"
            inputmode="url"
            aria-invalid={fieldError(form, "website")}
            aria-describedby={fieldError(form, "website")
              ? "website-help"
              : undefined}
            data-testid="profile-website"
          />
          {#if fieldError(form, "website")}
            <div id="website-help" class="mt-1 text-xs text-error">
              Please check this field.
            </div>
          {/if}
        </div>

        {#if form?.errorMessage}
          <div
            role="alert"
            class="alert alert-error text-sm"
            data-testid="profile-error"
          >
            <span>{form.errorMessage}</span>
          </div>
        {/if}

        <div class="card-actions justify-end pt-4">
          <button
            type="submit"
            class="btn btn-primary w-full btn-gradient-electric"
            disabled={loading}
            aria-disabled={loading}
            data-testid="profile-submit"
          >
            {#if loading}
              <span class="loading loading-spinner"></span>
              <span>Saving...</span>
            {:else}
              Create Profile &amp; Proceed
            {/if}
          </button>
        </div>
      </form>

      <div class="text-xs text-base-content/60 mt-6 text-center">
        <p>Logged in as: {user?.email}</p>
        <a class="link link-hover" href="/account/sign_out"
          >Not you? Sign out.</a
        >
      </div>
    </div>
  </div>
</div>
