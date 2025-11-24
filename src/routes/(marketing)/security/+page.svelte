<!-- FILE: src/routes/(marketing)/security/+page.svelte   -->
<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG, WebsiteName, WebsiteBaseUrl } from "../../../config"

  const mailtoHref = `mailto:${SITE_CONFIG.securityEmail}`

  // Dynamically build the JSON-LD object using our centralized config
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: WebsiteName,
    url: WebsiteBaseUrl,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "security",
        email: SITE_CONFIG.securityEmail,
        availableLanguage: ["en"],
      },
    ],
  }

  // Create a string that can be safely rendered as HTML, breaking up the closing script tag
  const jsonldScript =
    `<script type="application/ld+json">${JSON.stringify(ldJson)}</` + `script>`
</script>

<svelte:head>
  <meta name="robots" content="index,follow" />
  <!-- Open Graph for richer unfurls -->
  <meta
    property="og:title"
    content={`Security & Vulnerability Disclosure | ${WebsiteName}`}
  />
  <meta
    property="og:description"
    content={`Report suspected vulnerabilities to ${SITE_CONFIG.securityEmail}. Please avoid public disclosure until we've had reasonable time to address.`}
  />
  <meta property="og:type" content="website" />

  <!-- Structured data is now dynamically rendered -->
  {@html jsonldScript}
</svelte:head>

<ContentPage
  title="Security & Vulnerability Disclosure"
  description={`How to report a suspected security vulnerability to ${WebsiteName}. Please email ${SITE_CONFIG.securityEmail} and avoid public disclosure until remediation.`}
>
  <p>
    To report a suspected security vulnerability, please email
    <a href={mailtoHref}>{SITE_CONFIG.securityEmail}</a>. Do not publicly
    disclose the issue until we have had a reasonable time to address it.
  </p>

  <ul>
    <li>
      Please act in good faith and avoid data destruction or service disruption.
    </li>
    <li>
      Limit security testing to your own accounts. Do not attempt to access
      other users' data.
    </li>
  </ul>

  <p>
    We appreciate your help in keeping {WebsiteName} secure. No bug bounty is currently
    offered, but we value and will acknowledge responsible research.
  </p>
</ContentPage>
