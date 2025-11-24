<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG } from "../../../../config"
</script>

<ContentPage title="Accessibility">
  <p>
    We aim to conform to <strong
      >Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong
    > and improve accessibility over time.
  </p>
  <p>
    If you encounter an accessibility barrier, please contact us at <a
      href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a
    > with the page URL and a description of the issue.
  </p>
</ContentPage>
