<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG, WebsiteName } from "../../../../config"

  // Dynamically create the email template strings using the config
  const dmcaNoticeTemplate = `Subject: DMCA Notice - [Your Work / Reference]

To: ${SITE_CONFIG.legalEmail}

1. Signature: [Type full name as digital signature]
2. Copyrighted Work: [Describe the copyrighted work and provide a URL if available]
3. Location of Infringing Material: [Provide the full URL(s) where the infringing material is located]
4. Your Contact Information: [Full Name, Organization, Mailing Address, Phone Number, Email Address]
5. Good-Faith Belief Statement: I have a good-faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
6. Accuracy and Authority Statement: The information in this notice is accurate, and under penalty of perjury, I am the copyright owner or am authorized to act on the owner's behalf.
`

  const dmcaCounterNoticeTemplate = `Subject: DMCA Counter-Notice - [Your Reference]

To: ${SITE_CONFIG.legalEmail}

1. Signature: [Type full name as digital signature]
2. Removed Material: [Identify the material that was removed and the location where it appeared before removal (URL)]
3. Good-Faith Belief Statement: Under penalty of perjury, I have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification.
4. Your Contact Information: [Full Name, Mailing Address, Phone Number, Email Address]
5. Jurisdiction and Service Statement: I consent to the jurisdiction of the Federal District Court for the judicial district in which my address is located, or if my address is outside of the United States, for any judicial district in which ${SITE_CONFIG.companyLegalName} may be found, and I will accept service of process from the person who provided the original DMCA notice or their agent.
`
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<ContentPage
  title="DMCA &amp; Copyright Policy"
  description="How to submit a DMCA notice or counter-notice. Designated Agent contact details, required elements, and our repeat infringer policy."
>
  <p>
    {SITE_CONFIG.companyLegalName} (“{WebsiteName}”, “we”, “our”) respects the
    intellectual property rights of others and expects its users to do the same.
    This page explains how to submit a DMCA notice or counter-notice under 17
    U.S.C. §512 and outlines our repeat infringer policy.
  </p>

  <hr />

  <h2>1. Designated Agent</h2>
  <p>
    Send DMCA notices and counter-notices to our Designated Agent using the
    contact information below. This contact is for copyright matters only (not
    customer support).
  </p>

  <ul>
    <li>
      <strong>Agent:</strong> Legal Department, {SITE_CONFIG.companyLegalName}
    </li>
    <li>
      <strong>Email:</strong>
      <a href={`mailto:${SITE_CONFIG.legalEmail}`}>{SITE_CONFIG.legalEmail}</a>
    </li>
    <li>
      <strong>Telephone:</strong>
      <span class="whitespace-nowrap">{SITE_CONFIG.companyPhone}</span>
    </li>
    <li>
      <strong>Mailing Address:</strong><br />
      <span class="block">
        {#each SITE_CONFIG.companyAddress as line}
          {line}<br />
        {/each}
      </span>
    </li>
  </ul>

  <p class="text-sm">
    The email route is fastest. If you send by mail, include an email address so
    we can respond promptly.
  </p>

  <h2>2. How to Submit a DMCA Takedown Notice</h2>
  <p>
    To request removal of allegedly infringing material available through {WebsiteName}
    properties, your notice must include <em>all</em> of the following (per 17 U.S.C.
    §512(c)(3)):
  </p>
  <ol>
    <li>
      A physical or digital signature of the copyright owner or a person
      authorized to act on their behalf.
    </li>
    <li>
      Identification of the copyrighted work claimed to have been infringed (or
      a representative list if multiple).
    </li>
    <li>
      Identification of the material that is claimed to be infringing and
      information reasonably sufficient to permit us to locate the material
      (e.g., direct URL(s), timestamps, screenshots).
    </li>
    <li>
      Your contact information: full name, organization (if any), postal
      address, telephone number, and email address.
    </li>
    <li>
      A statement that you have a good-faith belief that use of the material in
      the manner complained of is not authorized by the copyright owner, its
      agent, or the law.
    </li>
    <li>
      A statement that the information in the notice is accurate, and
      <strong>under penalty of perjury</strong>, that you are the copyright
      owner or authorized to act on the owner’s behalf.
    </li>
  </ol>

  <h2>3. Counter-Notice (Restoration of Material)</h2>
  <p>
    If your material was removed or disabled due to a DMCA notice and you
    believe this was a mistake or a misidentification, you may submit a
    counter-notice. Your counter-notice must include:
  </p>
  <ol>
    <li>Your physical or digital signature.</li>
    <li>
      Identification of the material that was removed or disabled, and the
      location where it appeared before removal.
    </li>
    <li>
      A statement <strong>under penalty of perjury</strong> that you have a good-faith
      belief the material was removed or disabled as a result of mistake or misidentification.
    </li>
    <li>Your name, postal address, telephone number, and email address.</li>
    <li>
      A statement that you consent to the jurisdiction of the Federal District
      Court for the judicial district in which your address is located, or if
      outside the United States, for the United States District Court for the
      Western District of Texas, and that you will accept service of process
      from the person who provided the original DMCA notice or their agent.
    </li>
  </ol>

  <h2>4. Repeat Infringer Policy</h2>
  <p>
    Consistent with 17 U.S.C. §512(i), it is our policy to terminate, in
    appropriate circumstances, users who are deemed repeat infringers.
  </p>

  <h2>5. Misrepresentations &amp; Abuse</h2>
  <p>
    Under 17 U.S.C. §512(f), any person who knowingly misrepresents that
    material or activity is infringing may be liable for damages (including
    costs and attorneys’ fees).
  </p>

  <h2>6. Privacy Notice</h2>
  <p>
    We may forward your notice or counter-notice (including any contact details)
    to the affected user and, for transparency, to third-party databases such as
    the Lumen project.
  </p>

  <hr />

  <h2>Email Templates</h2>
  <details class="my-2">
    <summary class="cursor-pointer font-semibold"
      >DMCA Takedown Notice (Copy/Paste)</summary
    >
    <pre
      class="mt-2 p-4 bg-base-200 rounded-lg text-sm whitespace-pre-wrap">{dmcaNoticeTemplate}</pre>
  </details>

  <details class="my-2">
    <summary class="cursor-pointer font-semibold"
      >DMCA Counter-Notice (Copy/Paste)</summary
    >
    <pre
      class="mt-2 p-4 bg-base-200 rounded-lg text-sm whitespace-pre-wrap">{dmcaCounterNoticeTemplate}</pre>
  </details>

  <p class="text-xs text-base-content/60 mt-8">
    This page is provided for informational purposes and does not constitute
    legal advice.
  </p>
</ContentPage>
