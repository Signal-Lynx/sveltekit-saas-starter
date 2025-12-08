<!-- FILE: src/routes/(marketing)/legal/privacy/+page.svelte (COMPLETE REPLACEMENT) -->
<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG, WebsiteName } from "../../../../config"

  let showContact = $state(false)
</script>

<ContentPage
  title="Privacy Policy"
  description={`What we collect, how we use it, and your privacy choices at ${WebsiteName}.`}
>
  <p><em>Last updated: August 13, 2025</em></p>

  <h2>Who we are</h2>
  <p>
    Signal Lynx Solutions LLC (“Signal Lynx”, “we”) provides software and
    services for license management and trading automation.
  </p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Account identifiers:</strong> name, email, country/region.</li>
    <li>
      <strong>Licensing &amp; activations:</strong> product/plan, term, renewal status,
      activations/seats, Machine IDs, anonymized OS/hardware fingerprints.
    </li>
    <li>
      <strong>Transactions:</strong> dates, amounts, currency, tax amounts,
      processor metadata (brand/last-4).
      <strong>We do not store full card numbers.</strong>
    </li>
    <li>
      <strong>Operational logs:</strong> timestamps, versions, success/failure codes
      for install/activation/updates, API rate-limit events.
    </li>
    <li>
      <strong>Support:</strong> messages you send us and diagnostics you choose to
      provide.
    </li>
  </ul>
  <p>
    <strong
      >We do not ingest your trading strategies, positions, or account balances.</strong
    >
  </p>

  <h2>User Secrets</h2>
  <p>
    Exchange API keys and other secrets (“User Secrets”) are intended to remain
    on your own hardware and are not sent to us unless you explicitly provide
    them (e.g., in a support ticket). If you ever share a secret with us, rotate
    it immediately afterward.
  </p>

  <h2>How we use data</h2>
  <ul>
    <li>Provide, secure, and improve our products and services.</li>
    <li>Detect and prevent abuse and enforce our Terms of Service.</li>
    <li>Process payments and taxes via third-party processors.</li>
    <li>
      Communicate about service, security, and lawful marketing (where permitted
      or consented).
    </li>
  </ul>

  <h2>Your choices &amp; rights</h2>
  <ul>
    <li>Access, correct, or delete your data (subject to legal limits).</li>
    <li>Opt out of marketing at any time.</li>
  </ul>

  <h2>Security</h2>
  <p>
    We use administrative, technical, and organizational measures appropriate to
    risk. <strong
      >You are responsible for securing your devices, networks, and User
      Secrets.</strong
    >
  </p>

  <h2>Contact</h2>
  <p>
    For privacy-related inquiries, email:
    {#if showContact}
      <a href={`mailto:${SITE_CONFIG.privacyEmail}`}
        >{SITE_CONFIG.privacyEmail}</a
      >
    {:else}
      <button
        class="btn btn-xs btn-ghost text-primary underline decoration-dashed underline-offset-4"
        onclick={() => (showContact = true)}
        title="Click to reveal email"
      >
        Click to view
      </button>
    {/if}
  </p>
</ContentPage>
