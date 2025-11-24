<!-- src/routes/(marketing)/login/forgot_password/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms"

  type FormState = {
    email?: string
    error?: string
    success?: boolean
  } | null

  const { form }: { form: FormState } = $props()
  let isLoading = $state(false)

  const initialEmail = (form?.email ?? "").toString()
</script>

<svelte:head>
  <title>Forgot Password - Signal Lynx</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Forgot Password</h1>

{#if form?.success}
  <div role="status" aria-live="polite" class="alert alert-success">
    <span>
      If an account with that email exists, a password reset link has been sent.
    </span>
  </div>
{:else}
  <form
    method="POST"
    action="?/requestPasswordReset"
    aria-busy={isLoading}
    class="space-y-4"
    use:enhance={({
      action: _action,
      formData: _formData,
      formElement: _formElement,
      controller: _controller,
      submitter: _submitter,
      cancel: _cancel,
    }) => {
      // The parameters above match your installed SvelteKit typings.
      isLoading = true
      return async ({ update }) => {
        await update()
        isLoading = false
      }
    }}
  >
    <div>
      <label for="email" class="label label-text"
        >Enter your account email</label
      >
      <input
        id="email"
        name="email"
        type="email"
        value={initialEmail}
        class="input input-bordered w-full"
        required
        autocomplete="email"
        inputmode="email"
        enterkeyhint="send"
        aria-required="true"
        aria-invalid={form?.error ? "true" : "false"}
      />
    </div>

    {#if form?.error}
      <div role="alert" aria-live="assertive" class="alert alert-error text-sm">
        {form.error}
      </div>
    {/if}

    <button
      type="submit"
      class="btn btn-primary w-full btn-gradient-electric mt-4"
      disabled={isLoading}
      aria-disabled={isLoading ? "true" : "false"}
    >
      {#if isLoading}
        <span class="loading loading-spinner" aria-hidden="true"></span>
        <span class="ml-2">Sending...</span>
      {:else}
        Send Reset Link
      {/if}
    </button>
  </form>
{/if}

<div class="text-l mt-4">
  Remember your password? <a class="link" href="/login/sign_in">Sign in</a>.
</div>
