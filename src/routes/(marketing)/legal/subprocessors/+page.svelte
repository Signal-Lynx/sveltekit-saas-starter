<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
</script>

<ContentPage title="Subprocessors">
  <p><em>Last updated: August 13, 2025</em></p>

  <!-- Make wide tables scroll horizontally on small screens -->
  <div class="overflow-x-auto -mx-4 px-4 sm:mx-0">
    <table class="table table-zebra w-full">
      <thead>
        <tr>
          <th>Vendor</th>
          <th>Purpose</th>
          <th>Region</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Stripe</td><td>Payments</td><td>US/EU</td></tr>
        <tr
          ><td>Supabase</td><td>Cloud Hosting &amp; Database</td><td>US</td></tr
        >
        <tr><td>Resend</td><td>Transactional Email</td><td>US</td></tr>
        <tr><td>Cloudflare</td><td>CDN &amp; DNS</td><td>Global</td></tr>
      </tbody>
    </table>
  </div>
</ContentPage>
