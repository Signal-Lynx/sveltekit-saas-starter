<script lang="ts">
  import { page } from "$app/state"
  import { dev } from "$app/env"
  import { WebsiteName } from "../config"

  const status = $derived(page.status ?? 500)
  const currentError = $derived(page.error)

  function extractMessage(err: unknown): string | null {
    if (err == null) return null
    if (typeof err === "string") return err
    if (typeof err === "object" && "message" in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === "string") return msg
      try {
        return JSON.stringify(msg)
      } catch {
        /* no-op */
      }
    }
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }

  function extractStack(err: unknown): string | null {
    if (!dev || err == null || typeof err !== "object") return null
    const stack = (err as { stack?: unknown }).stack
    return typeof stack === "string" ? stack : null
  }
</script>

<svelte:head>
  <title>Error {status} - {WebsiteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="hero min-h-screen bg-base-100" aria-labelledby="error-title">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 id="error-title" class="text-8xl font-bold text-secondary">
        {status}
      </h1>

      <p class="py-4 text-3xl font-bold text-primary">
        Houston, We Have a Glitch.
      </p>

      <p class="text-lg text-base-content/80">
        Looks like you've navigated to a dead signal or our system had a
        momentary lapse in judgement. These things happen. Here's the
        diagnostic:
      </p>

      {#if extractMessage(currentError)}
        <div
          class="my-6 p-4 bg-base-200 rounded-lg text-left"
          role="alert"
          aria-live="polite"
        >
          <code class="text-accent block whitespace-pre-wrap wrap-break-word">
            ERROR: {extractMessage(currentError)}
          </code>
        </div>
      {/if}

      {#if extractStack(currentError)}
        <details class="my-4 text-left">
          <summary class="cursor-pointer select-none">
            Developer stack trace
          </summary>
          <pre
            class="mt-2 max-h-64 overflow-auto text-sm bg-base-200 p-3 rounded">
{extractStack(currentError)}</pre>
        </details>
      {/if}

      <div>
        <a
          href="/"
          class="btn btn-primary btn-lg btn-gradient-electric"
          data-sveltekit-reload
        >
          >Return to Command Center
        </a>
      </div>
    </div>
  </div>
</main>
