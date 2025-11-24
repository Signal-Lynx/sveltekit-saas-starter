<script lang="ts">
  import { WebsiteName } from "../../../config"
  // No script logic needed. We keep standard anchor tags for
  // semantic, progressively-enhanced navigation.
</script>

<svelte:head>
  <title>Get Started - {WebsiteName}</title>
  <meta
    name="description"
    content={`Create your ${WebsiteName} account or sign in to continue.`}
  />
</svelte:head>

<main class="min-h-[60vh] mx-auto max-w-xl px-4 py-8">
  <h1 class="text-xl font-bold">Get Started</h1>

  <nav class="mt-3" aria-label="Get started">
    <a
      href="/login/sign_up"
      class="btn btn-primary mt-3 btn-wide btn-gradient-electric"
      data-sveltekit-preload-data="hover"
      aria-label="Sign Up">Sign Up</a
    >
  </nav>

  <h2 class="text-xl mt-6">Already have an account?</h2>
  <nav class="mt-3" aria-label="Existing users">
    <a
      href="/login/sign_in"
      class="btn btn-primary mt-3 btn-wide btn-gradient-electric"
      data-sveltekit-preload-data="hover"
      aria-label="Sign In">Sign In</a
    >
  </nav>
</main>
