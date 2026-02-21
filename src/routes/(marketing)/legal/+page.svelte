<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG, WebsiteName } from "../../../config"

  // Get the list of legal pages from the central site configuration
  const legalLinks = SITE_CONFIG.footerNav.legal
</script>

<ContentPage
  title="Legal Center"
  description={`Central hub for all legal documents, policies, and terms for ${WebsiteName} products and services.`}
>
  <p>
    Welcome to the {WebsiteName} legal center. This page provides easy access to all
    of our policies, terms, and legal notices.
  </p>

  <h2 class="!mt-8 !mb-4">Policies & Documents</h2>
  <ul>
    {#each legalLinks as link}
      <li>
        <a href={link.href}>{link.name}</a>
      </li>
    {/each}
  </ul>

  <p class="!mt-8">
    If you have any questions about these documents, please don't hesitate to <a
      href="/contact_us">contact us</a
    >.
  </p>
</ContentPage>
