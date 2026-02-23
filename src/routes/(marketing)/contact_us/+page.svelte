<!-- FILE: src/routes/(marketing)/contact_us/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import { tick, onMount } from "svelte"
  import type { FullAutoFill } from "svelte/elements"
  import { WebsiteName, SITE_CONFIG } from "../../../config"
  import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public"

  // ---- State (Svelte Runes) -------------------------------------------------
  let errors: Record<string, string> = $state({})
  let loading = $state(false)
  let showSuccess = $state(false)

  // Turnstile state
  let captchaToken = $state("")
  let widgetEl: HTMLDivElement | null = $state(null)

  onMount(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!PUBLIC_TURNSTILE_SITE_KEY) {
      console.warn(
        "Turnstile: PUBLIC_TURNSTILE_SITE_KEY not set; CAPTCHA widget will not render.",
      )
      return
    }

    if (!widgetEl) {
      console.warn("Turnstile: widget container not bound (widgetEl is null).")
      return
    }

    const widgetContainer = widgetEl

    const renderWidget = () => {
      const ts = (window as any).turnstile
      if (!ts || typeof ts.render !== "function") {
        console.warn("Turnstile: global object not ready for render().")
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
        console.error("Turnstile: explicit render failed", err)
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
          "Turnstile: script never became available; widget skipped.",
        )
      }
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  })

  // ---- Types ----------------------------------------------------------------
  type Auto = FullAutoFill | "off"

  interface FormField {
    id: string
    label: string
    inputType: "text" | "email" | "tel" | "textarea"
    autocomplete: Auto
    required?: boolean
    describedBy?: string
  }

  const formFields: FormField[] = [
    {
      id: "first_name",
      label: "First Name *",
      inputType: "text",
      autocomplete: "given-name",
      required: true,
    },
    {
      id: "last_name",
      label: "Last Name *",
      inputType: "text",
      autocomplete: "family-name",
      required: true,
    },
    {
      id: "email",
      label: "Email *",
      inputType: "email",
      autocomplete: "email",
      required: true,
    },
    {
      id: "phone",
      label: "Phone Number",
      inputType: "tel",
      autocomplete: "tel",
    },
    {
      id: "company",
      label: "Company Name",
      inputType: "text",
      autocomplete: "organization",
    },
    {
      id: "message",
      label: "Message",
      inputType: "textarea",
      autocomplete: "off",
      describedBy: "message-help",
    },
  ]

  let successHeadingEl: HTMLHeadingElement | null = $state(null)
  let formEl: HTMLFormElement | null = $state(null)

  async function focusSuccess() {
    await tick()
    successHeadingEl?.focus()
  }

  function clearErrors() {
    errors = Object.create(null)
  }

  const handleSubmit: SubmitFunction = ({ cancel }) => {
    loading = true
    clearErrors()

    if (!captchaToken) {
      loading = false
      errors = { _: "Please complete the CAPTCHA." }
      cancel()
      return
    }

    return async ({ result, update }) => {
      loading = false

      if (result.type === "success" && result.status === 200) {
        showSuccess = true
        try {
          await update()
        } catch (_err) {
          void 0
        }
        formEl?.reset()
        try {
          ;(window as any).turnstile?.reset?.()
          captchaToken = ""
        } catch (_err) {
          void 0
        }
        focusSuccess()
        return
      }

      if (result.type === "failure") {
        errors = (result.data?.errors as Record<string, string>) ?? {}
        try {
          ;(window as any).turnstile?.reset?.()
          captchaToken = ""
        } catch (_err) {
          void 0
        }
        return
      }

      if (result.type === "error") {
        errors = { _: "An unexpected error occurred. Please try again." }
        try {
          ;(window as any).turnstile?.reset?.()
          captchaToken = ""
        } catch (_err) {
          void 0
        }
        return
      }

      errors = { _: "Unable to submit at this time. Please try again." }
      try {
        ;(window as any).turnstile?.reset?.()
        captchaToken = ""
      } catch (_err) {
        void 0
      }
    }
  }
</script>

<svelte:head>
  <title>Contact Us - {WebsiteName}</title>
  <meta
    name="description"
    content="Open a channel to the {WebsiteName} team. Get in touch via X, GitHub, or our secure contact form."
  />
  <script
    async
    defer
    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    crossorigin="anonymous"
  ></script>
</svelte:head>

<div class="py-12 px-4 bg-base-100">
  <div class="max-w-3xl mx-auto text-center">
    <h1 class="text-4xl md:text-6xl font-bold text-primary">Open a Channel</h1>
    <p class="mt-4 text-xl max-w-2xl mx-auto text-base-content/80">
      Whether you're reporting a spacetime anomaly or just saying hello, we're
      listening. Our comms are encrypted and monitored by beings from the
      future.
    </p>

    <!-- Template Support Alert (The 4th Wall Break) -->
    <!-- Replaced alert-info with bg-base-300 + border-secondary for better contrast -->
    <div
      class="alert bg-base-300 border-l-4 border-secondary shadow-lg mt-8 text-left max-w-2xl mx-auto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="stroke-secondary shrink-0 w-6 h-6"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path></svg
      >
      <div>
        <h3 class="font-bold text-white">Using this Template?</h3>
        <div class="text-sm text-base-content">
          Need help with setup? The form below works (if you configured SES),
          but for real support, reach out to
          <a
            href="https://signallynx.com"
            target="_blank"
            class="link link-primary font-bold">Signal Lynx</a
          > directly.
        </div>
      </div>
    </div>

    <div class="my-12">
      <h2 class="text-3xl font-bold text-secondary mb-6">The Fast Lane</h2>
      <div class="flex flex-col sm:flex-row gap-6 justify-center">
        {#each SITE_CONFIG.socials as social}
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-lg flex-1 btn-gradient-electric"
          >
            {social.name === "GitHub"
              ? "Fork on GitHub"
              : `Follow on ${social.name}`}
          </a>
        {/each}
      </div>
    </div>

    <div
      class="divider text-xl font-bold my-12"
      role="separator"
      aria-label="or"
    >
      OR
    </div>

    <div id="form-section">
      {#if showSuccess}
        <div
          class="card card-border shadow-lg bg-base-200 py-10 px-6 mx-auto max-w-lg"
          role="status"
          aria-live="polite"
        >
          <h2
            class="text-3xl font-bold text-success mb-4"
            tabindex="-1"
            bind:this={successHeadingEl}
          >
            Signal Received!
          </h2>
          <p class="text-lg">
            We've got your transmission. Our team will decipher it and get back
            to you shortly. Assuming the timeline doesn't shift again.
          </p>
        </div>
      {:else}
        <div class="max-w-lg mx-auto">
          <h2 class="text-3xl font-bold text-secondary mb-2">
            The Formal Route
          </h2>
          <p class="mb-8 text-base-content/70">
            For partnership inquiries, custom quotes, or messages that require a
            bit more gravitas. This form dispatches directly to your configured
            admin email.
          </p>

          {#if errors._}
            <div
              role="alert"
              aria-live="polite"
              class="alert alert-error text-sm mb-4"
            >
              <span>{errors._}</span>
            </div>
          {/if}

          <div class="card card-border shadow-lg bg-base-200 p-6">
            <form
              method="POST"
              action="?/submitContactUs"
              use:enhance={handleSubmit}
              bind:this={formEl}
              novalidate
              aria-busy={loading}
            >
              {#each formFields as field}
                <div class="w-full">
                  <label for={field.id} class="label">
                    <span class="font-bold">{field.label}</span>
                    {#if errors[field.id]}
                      <span
                        id={`${field.id}-error`}
                        class="text-error"
                        aria-live="polite">{errors[field.id]}</span
                      >
                    {/if}
                  </label>

                  {#if field.inputType === "textarea"}
                    <textarea
                      id={field.id}
                      name={field.id}
                      rows={4}
                      autocomplete={field.autocomplete}
                      aria-required={field.required ? "true" : "false"}
                      aria-invalid={errors[field.id] ? "true" : "false"}
                      aria-describedby={field.describedBy
                        ? field.describedBy
                        : errors[field.id]
                          ? `${field.id}-error`
                          : undefined}
                      class="textarea h-24"
                      class:textarea-error={Boolean(errors[field.id])}
                    ></textarea>
                    {#if field.describedBy === "message-help"}
                      <div id="message-help" class="mt-1 text-xs opacity-70">
                        Share as much detail as you like. No sensitive keys,
                        please.
                      </div>
                    {/if}
                  {:else}
                    <input
                      id={field.id}
                      name={field.id}
                      type={field.inputType}
                      autocomplete={field.autocomplete}
                      inputmode={field.inputType === "tel" ? "tel" : undefined}
                      spellcheck={field.inputType === "email"
                        ? "false"
                        : undefined}
                      aria-required={field.required ? "true" : "false"}
                      aria-invalid={errors[field.id] ? "true" : "false"}
                      aria-describedby={errors[field.id]
                        ? `${field.id}-error`
                        : undefined}
                      class="input w-full"
                      class:input-error={Boolean(errors[field.id])}
                    />
                  {/if}
                </div>
              {/each}

              <!-- Ensure the token is actually part of FormData -->
              <input
                id="cf-turnstile-response"
                type="hidden"
                name="cf-turnstile-response"
                value={captchaToken}
              />

              <!-- Empty container; we render into this explicitly in onMount -->
              <div class="mt-4" bind:this={widgetEl}></div>

              <div class="mt-6">
                <button
                  type="submit"
                  class="btn btn-primary btn-gradient-electric"
                  disabled={loading}
                  aria-disabled={loading}
                >
                  {#if loading}
                    <span class="loading loading-spinner" aria-hidden="true"
                    ></span>
                    Transmitting...
                  {:else}
                    Send Secure Message
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
