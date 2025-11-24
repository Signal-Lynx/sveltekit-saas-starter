<!-- FILE: src/routes/(marketing)/legal/billing/+page.svelte   -->
<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { WebsiteName } from "../../../../config"
</script>

<ContentPage
  title="Billing & Refunds"
  description={`How billing, renewals, price updates, and refunds work at ${WebsiteName}.`}
>
  <ul>
    <li>
      <strong>Auto-renewal:</strong> Subscriptions bill in advance and auto-renew
      unless you cancel before the renewal date.
    </li>
    <li>
      <strong>Price changes:</strong> Price updates apply at your next renewal. Continued
      subscription equals acceptance of the new price.
    </li>
    <li>
      <strong>No refunds:</strong> All fees are non-refundable to the maximum extent
      permitted by law.
    </li>
    <li>
      <strong>Payment processing:</strong> Handled by Stripe. We don’t store full
      card numbers.
    </li>
    <li>
      <strong>Cancel anytime:</strong> Use the
      <a href="/account/billing/manage">Manage Subscription</a> portal.
    </li>
    <li>
      <strong>Chargebacks:</strong> Please contact us first; unauthorized chargebacks
      may result in account suspension and collections.
    </li>
  </ul>
</ContentPage>
