<!-- src/routes/(marketing)/login/sign_in/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms"

  type FormState = {
    email?: string
    error?: string
  } | null

  const { form }: { form: FormState } = $props()
  let isLoading = $state(false)
  let showPassword = $state(false)

  const errorId = "signin-error"
</script>

<svelte:head>
  <title>Sign In - Signal Lynx</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Sign In</h1>

<form
  method="POST"
  action="?/signIn"
  aria-busy={isLoading}
  aria-describedby={form?.error ? errorId : undefined}
  class="space-y-4"
  use:enhance={() => {
    isLoading = true
    return async ({ update }) => {
      try {
        await update()
      } finally {
        isLoading = false
      }
    }
  }}
  autocomplete="on"
>
  <div>
    <label for="email" class="label">Email</label>
    <!-- Pre-fill with any server-returned value; do not transform the posted data -->
    <input
      id="email"
      name="email"
      type="email"
      inputmode="email"
      autocomplete="email"
      autocapitalize="none"
      spellcheck={false}
      value={form?.email ?? ""}
      class="input w-full"
      required
      aria-invalid={form?.error ? "true" : "false"}
    />
  </div>

  <div class="relative">
    <label for="password" class="label">Password</label>
    <input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"}
      autocomplete="current-password"
      class="input w-full pr-12"
      required
      aria-invalid={form?.error ? "true" : "false"}
    />
    <!-- Show/Hide password toggle (does not change submitted field name/value) -->
    <button
      type="button"
      class="btn btn-ghost btn-xs absolute right-2 top-9"
      onclick={() => (showPassword = !showPassword)}
      aria-pressed={showPassword}
      aria-label={showPassword ? "Hide password" : "Show password"}
      title={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  </div>

  {#if form?.error}
    <div
      id={errorId}
      role="alert"
      aria-live="polite"
      class="alert alert-error text-sm"
    >
      {form.error}
    </div>
  {/if}

  <button
    type="submit"
    class="btn btn-primary w-full btn-gradient-electric mt-4"
    disabled={isLoading}
    data-testid="signin-submit"
  >
    {#if isLoading}
      <span class="loading loading-spinner" aria-hidden="true"></span>
      <span class="ml-2">Signing In...</span>
    {:else}
      Sign In
    {/if}
  </button>
</form>

<div class="text-l mt-4">
  <a class="link" href="/login/forgot_password">Forgot password?</a>
</div>
<div class="text-l mt-3">
  Don't have an account? <a class="link" href="/login/sign_up">Sign up</a>.
</div>

<noscript>
  <p class="text-sm mt-4 opacity-70">
    JavaScript is disabled. The form will still submit, but you won’t see inline
    progress indicators.
  </p>
</noscript>
