<script lang="ts">
  import { enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import { onMount } from "svelte"
  import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public"

  type FormState = {
    email?: string
    error?: string
    success?: boolean
  } | null

  const { form }: { form: FormState } = $props()
  let isLoading = $state(false)

  // --- Turnstile state (same pattern as Contact Us) ---
  let captchaToken = $state("")
  let widgetEl: HTMLDivElement | null = $state(null)

  onMount(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!PUBLIC_TURNSTILE_SITE_KEY) {
      console.warn(
        "Turnstile (sign-up): PUBLIC_TURNSTILE_SITE_KEY not set; CAPTCHA widget will not render.",
      )
      return
    }

    if (!widgetEl) {
      console.warn("Turnstile (sign-up): widget container not bound.")
      return
    }

    const widgetContainer = widgetEl

    const renderWidget = () => {
      const ts = (window as any).turnstile
      if (!ts || typeof ts.render !== "function") {
        console.warn(
          "Turnstile (sign-up): global object not ready for render().",
        )
        return
      }

      try {
        ts.render(widgetContainer, {
          sitekey: PUBLIC_TURNSTILE_SITE_KEY,
          theme: "dark",
          callback(token: string) {
            captchaToken = token
          },
          "expired-callback"() {
            captchaToken = ""
          },
          "error-callback"() {
            captchaToken = ""
          },
        })
      } catch (err) {
        console.error("Turnstile (sign-up): explicit render failed", err)
      }
    }

    let attempts = 0
    const maxAttempts = 20

    const intervalId = window.setInterval(() => {
      const ts = (window as any).turnstile
      attempts += 1

      if (ts && typeof ts.render === "function") {
        window.clearInterval(intervalId)
        renderWidget()
      } else if (attempts >= maxAttempts) {
        window.clearInterval(intervalId)
        console.warn(
          "Turnstile (sign-up): script never became available; widget skipped.",
        )
      }
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  })

  // Enhance handler: block submit without a token; reset widget after submit
  const handleSubmit: SubmitFunction = ({ cancel }) => {
    isLoading = true

    // Block submit if token not ready
    if (!captchaToken) {
      isLoading = false
      cancel()
      return
    }

    return async ({ update }) => {
      try {
        await update()
      } finally {
        isLoading = false
        try {
          ;(window as any).turnstile?.reset?.()
        } catch (_err) {
          void 0
        }
        captchaToken = ""
      }
    }
  }
</script>

<svelte:head>
  <title>Sign Up - Signal Lynx</title>
  <script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    async
    defer
    crossorigin="anonymous"
  ></script>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Sign Up</h1>

{#if form?.success}
  <div role="alert" class="alert alert-success">
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
    <span>Check your email to verify your account and complete sign-up.</span>
  </div>
{:else}
  <form
    method="POST"
    action="?/signUp"
    use:enhance={handleSubmit}
    class="space-y-4"
  >
    <div>
      <label for="email" class="label label-text">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autocomplete="email"
        value={form?.email ?? ""}
        class="input input-bordered w-full"
        required
      />
    </div>
    <div>
      <label for="password" class="label label-text">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autocomplete="new-password"
        class="input input-bordered w-full"
        required
      />
    </div>

    <!-- === START: TERMS OF SERVICE AGREEMENT CHECKBOX (UPDATED) === -->
    <div class="form-control mt-4">
      <label class="label cursor-pointer items-start">
        <input
          type="checkbox"
          name="terms"
          id="terms"
          class="checkbox checkbox-accent mr-3 mt-1"
          required
        />
        <span class="label-text text-left">
          I have read and agree to the
          <a
            href="/terms-of-service"
            target="_blank"
            class="link link-secondary font-semibold hover:link-primary"
          >
            Terms of Service
          </a>.
        </span>
      </label>
    </div>
    <!-- === END: TERMS OF SERVICE AGREEMENT CHECKBOX === -->

    <!-- Ensure token is submitted with the form -->
    <input
      id="cf-turnstile-response"
      type="hidden"
      name="cf-turnstile-response"
      value={captchaToken}
    />

    <!-- Turnstile widget container (explicit render) -->
    <div class="mt-4" bind:this={widgetEl}></div>

    {#if form?.error}
      <div role="alert" class="alert alert-error text-sm">{form.error}</div>
    {/if}

    <button
      type="submit"
      class="btn btn-primary w-full btn-gradient-electric mt-4"
      disabled={isLoading || !captchaToken}
    >
      {#if isLoading}
        <span class="loading loading-spinner"></span> Creating Account...
      {:else}
        Sign Up
      {/if}
    </button>
  </form>
{/if}

<div class="text-l mt-4">
  Have an account? <a class="link" href="/login/sign_in">Sign in</a>.
</div>
