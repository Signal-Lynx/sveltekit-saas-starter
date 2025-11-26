<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG } from "../../../config"

  const _lastUpdated = "November 26, 2025"
</script>

<ContentPage
  title={`${SITE_CONFIG.companyLegalName.toUpperCase()} GLOBAL TERMS OF SERVICE & END-USER LICENSE AGREEMENT (TOS/EULA)`}
  description={`The official Global Terms of Service and End-User License Agreement for all ${SITE_CONFIG.companyLegalName} products and properties.`}
>
  <div class="prose max-w-4xl">
    <p>
      <em>
        NOTE: This page is a generic template. Update the text with your own
        legal counsel and jurisdiction-specific requirements before using in
        production.
      </em>
    </p>

    <p><em>Last Updated: {_lastUpdated}</em></p>

    <h2>1) Introduction &amp; Scope (the "Agreement")</h2>
    <p>
      These Terms of Service and End-User License Agreement (collectively, the
      "Terms") are a binding contract between you ("you" or "User") and {SITE_CONFIG.companyLegalName}
      (the "Company", "we", "us", or "our"). These Terms govern your access to and
      use of all properties operated by or on behalf of the Company, including (as
      applicable) websites, web apps and portals; desktop, server, or mobile software
      and installers; setup and configuration utilities; application programming
      interfaces (APIs) and software development kits (SDKs); back-end services;
      content, documentation, and emails; marketing and communications across all
      channels (including social media, webinars, trade shows, and in-person demos);
      and contests, giveaways, or promotions (collectively, the "Properties").
    </p>
    <p>
      By creating an account, making a purchase, installing or using any
      Software (as defined below), or accessing any Property, you agree to these
      Terms. If you accept these Terms on behalf of an entity, you represent and
      warrant that you have the authority to bind that entity, and all
      references to "you" will refer to that entity and its users. <strong
        >If you do not agree to these Terms, do not use the Properties.</strong
      >
    </p>

    <h2>2) Definitions</h2>
    <p>
      <strong>Software:</strong> Any executable, library, script, configuration or
      setup utility, automation tooling, license manager, or related component provided
      by or on behalf of the Company.
    </p>
    <p>
      <strong>Subscription:</strong> Time-limited access to certain Properties or
      features that renews automatically at the end of each term unless canceled
      in accordance with these Terms.
    </p>
    <p>
      <strong>Perpetual License:</strong> A license without a renewal term, though
      eligibility for updates, support, or online services may be time-limited.
    </p>
    <p>
      <strong>Seat / Activation / Machine ID:</strong> License controls that limit
      simultaneous device or user activations; a Machine ID uniquely identifies a
      device, environment, or instance for licensing purposes.
    </p>
    <p>
      <strong>User Secrets:</strong> Your private keys, credentials, tokens, API
      keys, or other sensitive configuration data that you control.
    </p>
    <p>
      <strong>Community Channels:</strong> The Company's social media, forums, chat
      groups, newsletters, webinars, trade-show sessions, and similar venues where
      users may interact or receive information about the Properties.
    </p>

    <h2>3) Privacy, Security &amp; User Secrets</h2>
    <h3>3.1 Incorporated Policies.</h3>
    <p>
      Our use of personal data and other information is governed by our Privacy
      Policy, which is incorporated into these Terms by reference. If we process
      personal data on your behalf under a separate agreement (such as a data
      processing agreement or business associate agreement), that agreement will
      also apply as described therein.
    </p>
    <h3>3.2 Data We Collect.</h3>
    <p>
      To provide, secure, maintain, and improve the Properties, we may collect
      and process information such as:
    </p>
    <ol type="a">
      <li>
        account identifiers (for example, name, email address, region or
        country);
      </li>
      <li>
        license and entitlement records (for example, product or plan, term,
        renewal status, activation counts, Machine IDs, and limited hardware or
        OS information in pseudonymous or anonymized form);
      </li>
      <li>
        transactional records (for example, purchase dates, amounts, currency,
        taxes, and processor-supplied metadata such as card brand or last four
        digits&mdash;we do not store full payment card numbers);
      </li>
      <li>
        security and operational logs (for example, timestamps, software
        versions, basic success or failure codes for installation, activation,
        updates, and API rate-limit events);
      </li>
      <li>
        support metadata (for example, ticket identifiers, your communications
        with us, and diagnostics or log data that you choose to provide).
      </li>
    </ol>
    <p>
      Unless explicitly stated otherwise in our Privacy Policy or a separate
      agreement, we do not monitor the specific business activities or
      strategies you implement using the Properties (for example, trading
      strategies, automation workflows, or similar logic).
    </p>
    <h3>3.3 User Secrets.</h3>
    <p>
      "User Secrets" (for example, API keys, private tokens, SMTP credentials,
      SSH keys, or similar secrets) are intended to be stored locally or within
      your controlled infrastructure and are not transmitted to our servers
      unless you explicitly send them to us (for example, in a support ticket).
      If you choose to share any Secret with us, you should rotate or replace it
      immediately after the support interaction. You are solely responsible for
      safeguarding User Secrets and the systems, environments, and accounts
      where they are stored or used.
    </p>
    <h3>3.4 Security of Your Environment.</h3>
    <p>
      You are responsible for securing your own environment, including
      operating-system hardening, firewalls and endpoint protection, access
      controls, credential hygiene, backup and restore procedures, and timely
      patching. The Company is not liable for security incidents, breaches,
      losses, or damages arising from your environment, your configuration
      choices, or third-party accounts and services that you control.
    </p>
    <h3>3.5 Telemetry (if enabled).</h3>
    <p>
      If an optional telemetry or diagnostics feature is enabled in the
      Properties, we will describe what is collected and provide an opt-out
      where feasible. Telemetry, if any, will not intentionally include User
      Secrets.
    </p>
    <h3>3.6 Processors &amp; Subprocessors.</h3>
    <p>
      We may use reputable third-party providers (for example, cloud hosting
      vendors, analytics providers with appropriate safeguards, and payment
      processors) to operate the Properties. We remain responsible for our
      processors in accordance with applicable law and our agreements with them.
    </p>

    <h2>4) License Grant; Ownership; Restrictions</h2>
    <p>
      Subject to your compliance with these Terms and timely payment of all
      applicable fees, the Company grants you a limited, non-exclusive,
      non-transferable, non-sublicensable, revocable license to install and use
      the Software and services that you purchase or are otherwise lawfully
      provided, solely for your own lawful internal business or personal
      purposes, and strictly in accordance with documentation and applicable
      usage parameters (for example, seats, activations, or rate limits).
    </p>
    <p>
      <strong>Restrictions.</strong> You will not (and will not permit any third
      party to):
    </p>
    <ol type="a">
      <li>
        copy (except for one reasonable backup), modify, translate, or create
        derivative works of the Properties, except as expressly permitted by
        open-source licenses or other written terms;
      </li>
      <li>
        reverse engineer, decompile, disassemble, or otherwise attempt to derive
        the source code of proprietary components of the Properties, except to
        the limited extent allowed by applicable law notwithstanding contractual
        prohibitions;
      </li>
      <li>
        circumvent, disable, or otherwise interfere with license enforcement,
        security mechanisms, or technical restrictions in the Properties;
      </li>
      <li>
        resell, rent, lease, lend, timeshare, or host the Properties for the
        benefit of third parties, or provide the Properties as a service, except
        as expressly permitted in a separate written agreement with the Company;
      </li>
      <li>
        publish or disclose any performance, benchmark, or security test results
        regarding the Properties without our prior written consent;
      </li>
      <li>
        remove or alter any proprietary notices or labels on the Properties;
      </li>
      <li>
        exceed applicable licensing parameters, seats, activations, usage caps,
        or rate limits, or share license keys, tokens, or credentials with
        unauthorized users.
      </li>
    </ol>
    <p>
      The Company and its licensors retain all right, title, and interest in and
      to the Properties, including all related intellectual property rights. No
      rights or licenses are granted to you except as expressly set forth in
      these Terms.
    </p>

    <h2>5) Your Content &amp; Feedback</h2>
    <p>
      You retain ownership of content you create, upload, or submit through the
      Properties ("Your Content"). By posting or submitting Your Content in
      Community Channels or other public or shared areas of the Properties, you
      grant the Company a worldwide, non-exclusive, royalty-free, transferable,
      and sublicensable license to host, store, reproduce, display, perform, and
      adapt Your Content as reasonably necessary to operate, improve, and
      promote the Properties. Do not post confidential or sensitive information
      in public or shared areas.
    </p>
    <p>
      If you provide feedback, suggestions, or ideas regarding the Properties
      ("Feedback"), you acknowledge that the Company may use such Feedback
      without restriction or obligation to you, including without attribution,
      payment, or other compensation.
    </p>

    <h2>6) Eligibility, Compliance &amp; Export</h2>
    <p>
      You must be at least the age of majority in your jurisdiction (and in any
      event at least 18 years old) to use the Properties. You are responsible
      for compliance with all laws and regulations that apply to your use of the
      Properties and your business activities.
    </p>
    <p>
      You represent and warrant that you are not located in, organized in, or a
      resident of any jurisdiction subject to comprehensive embargoes or other
      trade restrictions, and that you are not on any government list of
      prohibited or restricted parties. You will not use the Properties for any
      purpose prohibited by applicable sanctions, export control, or other laws.
    </p>

    <h2>
      7) Purchases, Billing, Auto-Renewal, Price Changes, Refunds &amp;
      Chargebacks
    </h2>
    <h3>7.1 Scope.</h3>
    <p>
      These Terms apply to subscriptions, perpetual licenses, upgrades, add-ons,
      digital goods, services, bundles, credits, trials, and promotions that the
      Company makes available, whether through its own Properties or through
      authorized marketplaces or resellers.
    </p>
    <h3>7.2 Billing &amp; Auto-Renewal.</h3>
    <p>
      Subscriptions are billed in advance and, unless otherwise stated,
      automatically renew for successive terms of the same length at the
      then-current rate until you cancel. You can cancel in your account or
      through the method provided in the ordering process, subject to any notice
      requirements disclosed at purchase. Continued access to a subscription
      after any price change or renewal date constitutes acceptance of the
      then-current price and terms. Where required by law, we will provide
      renewal or price-increase notices; otherwise, changes take effect at the
      next renewal after posting or notice.
    </p>
    <h3>7.3 Taxes &amp; Fees.</h3>
    <p>
      Prices generally exclude taxes, duties, and third-party fees unless
      expressly stated otherwise. You are responsible for any applicable taxes,
      duties, or government charges associated with your purchases, other than
      taxes based on the Company's net income.
    </p>
    <h3>7.4 Payment Processing by Third Parties.</h3>
    <p>
      Payments are processed by independent third-party payment processors (for
      example, Stripe or PayPal). The Company does not store full payment card
      numbers. You authorize the Company to share transaction information with
      the payment processor as necessary for billing, fraud screening, Strong
      Customer Authentication (such as 3-D Secure), refunds (if any), and
      compliance. Your payment method may be subject to the processor's terms
      and privacy policy, and the Company is not responsible for their acts or
      omissions.
    </p>
    <h3>7.5 No Refunds.</h3>
    <p>
      To the maximum extent permitted by law, all fees are non-refundable and
      non-creditable. If applicable law grants you a statutory withdrawal or
      cooling-off right for digital services, you acknowledge that service may
      begin immediately and you consent to immediate performance, waiving such
      withdrawal right to the extent permitted by law. If you do not consent, do
      not access the service until the applicable period has ended.
    </p>
    <h3>7.6 Chargebacks &amp; Remedies.</h3>
    <p>
      You agree to contact the Company's support team to attempt to resolve
      billing issues before initiating a chargeback with your payment provider.
      Chargebacks made without first attempting to resolve the issue with the
      Company may be treated as a material breach of these Terms. You agree to
      reimburse the Company for amounts reversed, processor fees, and reasonable
      collection costs, and we may suspend or terminate access to the Properties
      for accounts involved in chargebacks.
    </p>

    <h2>8) Activations, Machine IDs &amp; Reset Limits</h2>
    <p>
      Licenses may be limited by seat, activation, and/or binding to a Machine
      ID. The Company may offer self-service activation resets subject to
      time-based limits and anti-abuse controls (for example, not more than a
      defined number of resets per license within a given interval). Resets are
      not available for expired or canceled licenses. The Company may require
      additional verification (for example, proof of hardware change) and may
      deny resets in cases of suspected abuse or fraud.
    </p>

    <h2>9) APIs &amp; Rate Limits</h2>
    <p>
      Use of any Company API is subject to applicable documentation,
      authentication requirements, and published or communicated rate limits.
      You may not share API keys or tokens outside your organization, scrape or
      access the Properties by automated means not authorized by the Company, or
      use the APIs in a manner that circumvents intended usage limits. The
      Company may monitor API usage and may throttle, suspend, or revoke API
      access for abuse, security risks, or violation of these Terms.
    </p>

    <h2>10) Third-Party Platforms &amp; Your Integrations</h2>
    <p>
      The Properties may interoperate with or depend on third-party platforms or
      services (for example, data providers, exchanges, cloud services,
      analytics tools, or messaging platforms). The Company does not control and
      is not responsible for such third-party services, their availability,
      terms, or privacy practices. You are responsible for maintaining valid
      accounts with third parties and for complying with their terms and
      policies.
    </p>
    <p>
      If you integrate any Company-provided licensing or activation systems into
      software or services that you offer to your own users, you are solely
      responsible for your software, services, and user relationships, and you
      agree to indemnify the Company for claims arising from your products,
      services, or failure to maintain appropriate licensing or business
      continuity for your users.
    </p>

    <h2>11) Promotions, Giveaways, Events &amp; "All-Channels" Marketing</h2>
    <p>
      Promotions (including contests, giveaways, referral programs, or
      trade-show activations) may be subject to separate Official Rules that
      govern eligibility, selection, and prizes. Promotions are void where
      prohibited by law and may be modified, suspended, or terminated at any
      time. The Company may require eligibility verification and tax or
      regulatory forms where applicable.
    </p>
    <p>
      All communications across all Company channels&mdash;including but not
      limited to emails, websites, social media, webinars, trade-show
      presentations, and in-person demonstrations&mdash;are for informational
      and educational purposes only and do not constitute financial, legal, tax,
      or other professional advice.
    </p>

    <h2>12) Beta, Trials &amp; Pre-release</h2>
    <p>
      Alpha or beta builds, previews, experimental features, and free trials
      (collectively, "Pre-release Features") may be provided solely for
      evaluation, testing, or feedback. Pre-release Features are provided "AS
      IS" and "AS AVAILABLE," without warranty, support, or any commitment to
      further develop or release them, and they may be changed or discontinued
      at any time. Pre-release Features may be unstable, may not be backed up,
      and may risk data loss or corruption. You should not rely on Pre-release
      Features for production use.
    </p>

    <h2>13) System Configuration Utilities &amp; Setup Scripts</h2>
    <p>
      Some Properties may include installers, scripts, or utilities that modify
      system or application settings, install dependencies, configure services,
      or automate other setup steps (collectively, "Setup Tools"). <strong
        >YOU USE SETUP TOOLS AT YOUR OWN SOLE RISK.</strong
      >
      You are responsible for maintaining full system images and backups, ensuring
      compatibility with your security tools (for example, endpoint detection and
      response, antivirus, or firewalls), and verifying that Setup Tools are appropriate
      for your environment.
    </p>
    <p>
      To the maximum extent permitted by law, the Company disclaims liability
      for damage, data loss, instability, or incompatibility resulting from your
      use of Setup Tools, including interactions with third-party software,
      drivers, or services.
    </p>

    <h2>14) Service Availability, Changes &amp; Support</h2>
    <p>
      The Company may add, change, or discontinue any Property or feature at any
      time. Unless expressly stated in a separate service-level agreement signed
      by the Company, there is no guaranteed uptime or service-level commitment.
      Outages or interruptions may occur for many reasons, including
      maintenance, provider failures, DDoS attacks, force majeure events, or
      unavailability of key personnel or third-party services.
    </p>
    <p>
      Support is generally provided on a reasonable-efforts basis through the
      channels identified on the Properties. Unless expressly agreed otherwise
      in writing, the Company does not guarantee specific support response or
      resolution times.
    </p>

    <h2>14A) License Services Availability &amp; Your Business Continuity</h2>
    <p>
      <strong>No SLA for Entitlement or Activation.</strong> License activation,
      entitlement, update, and validation endpoints (whether hosted by the Company
      or self-hosted by you using Company-provided components) may be unavailable,
      throttled, modified, or deprecated without notice and may be affected by third-party
      outages or incidents.
    </p>
    <p>
      <strong>Your Redundancy Obligations.</strong> You are solely responsible for
      designing your applications, operations, and business processes to tolerate
      temporary unavailability of licensing or activation endpoints (for example,
      by using grace modes, local caching, or offline checks) according to your risk
      tolerance. The Company has no obligation to provide failover, escrow, uptime
      guarantees, or offline keys unless expressly agreed in a separate signed writing.
    </p>
    <p>
      <strong>No Credits or Refunds.</strong> To the maximum extent permitted by
      law, the Company will not provide refunds, credits, extensions, or other compensation
      for downtime or unavailability of license, activation, entitlement, or update
      services.
    </p>
    <p>
      <strong>Downstream Use.</strong> If you use Company-provided licensing or activation
      tools in software or services that you distribute to your users, you are solely
      responsible for that software or service and for your relationships with your
      users. You agree to indemnify the Company for claims arising from unavailability
      of licensing or activation capabilities in your offerings.
    </p>

    <h2>15) Acceptable Use (AUP) &mdash; Prohibited Conduct</h2>
    <p>You will not, and will not permit others to:</p>
    <ol type="a">
      <li>
        use the Properties in violation of applicable law or third-party rights;
      </li>
      <li>
        use the Properties to engage in fraudulent, deceptive, manipulative, or
        abusive practices of any kind;
      </li>
      <li>
        conduct denial-of-service attacks, stress testing, or load testing
        against the Properties or any third-party platform except as expressly
        authorized in writing;
      </li>
      <li>
        bypass security or license controls; scrape, crawl, or harvest data from
        the Properties in violation of these Terms or applicable third-party
        terms;
      </li>
      <li>
        distribute malware, spyware, or unsolicited commercial communications
        (spam);
      </li>
      <li>harm or attempt to exploit minors or vulnerable persons;</li>
      <li>
        post or transmit content that is illegal, infringing, defamatory,
        hateful, harassing, or otherwise objectionable as determined by the
        Company in its reasonable discretion.
      </li>
    </ol>
    <p>
      The Company may investigate suspected violations of this Acceptable Use
      Policy and may suspend or terminate access to the Properties in its
      discretion where it reasonably believes a violation has occurred or a risk
      to the Properties or others exists.
    </p>

    <h2>16) DMCA &amp; Copyright Notices</h2>
    <p>
      If you believe that content accessible via the Properties infringes your
      copyright, you may submit a notice in accordance with the U.S. Digital
      Millennium Copyright Act (DMCA) or similar laws, addressed to the
      Company's designated agent as described on our DMCA or copyright page (if
      provided) on the website. That page will include current contact details
      and instructions for notices and counter-notices.
    </p>
    <p>
      The Company will respond to notices that comply with applicable law and
      may in appropriate circumstances remove or disable access to allegedly
      infringing content and terminate repeat infringers.
    </p>

    <h2>17) Open-Source &amp; Third-Party Components</h2>
    <p>
      The Software may include open-source or third-party components that are
      provided under their own licenses. Those licenses govern the use of such
      components to the extent they are inconsistent with these Terms. The
      Company may provide a NOTICE or LICENSES file identifying applicable
      open-source or third-party licenses.
    </p>

    <h2>18) Disclaimers, Risk &amp; Non-Advice</h2>
    <p>
      YOU USE THE PROPERTIES AT YOUR SOLE RISK. EXCEPT AS EXPRESSLY SET FORTH IN
      A SEPARATE WRITTEN AGREEMENT, THE PROPERTIES ARE PROVIDED "AS IS" AND "AS
      AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR
      STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
      PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
    </p>
    <p>
      The Company is not a broker-dealer, investment adviser, or financial
      institution, and no content or communication made available through the
      Properties constitutes financial, legal, tax, or other professional
      advice. Business, technology, and financial activities (including, without
      limitation, trading or automation) involve risk, including the risk of
      substantial losses. You are solely responsible for your strategies,
      configuration, risk controls, and outcomes. You should consult your own
      professional advisers as appropriate.
    </p>

    <h2>19) Limitation of Liability</h2>
    <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
    <ol type="a">
      <li>
        <strong>Exclusion.</strong> THE COMPANY WILL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, COVER, EXEMPLARY, OR PUNITIVE DAMAGES;
        FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY;
        OR FOR THE COST OF SUBSTITUTE GOODS OR SERVICES, EVEN IF ADVISED OF THE POSSIBILITY
        OF SUCH DAMAGES.
      </li>
      <li>
        <strong>Cap.</strong> THE COMPANY'S TOTAL AGGREGATE LIABILITY ARISING OUT
        OF OR RELATED TO THE PROPERTIES OR THESE TERMS WILL NOT EXCEED THE AMOUNTS
        YOU PAID TO THE COMPANY FOR THE SPECIFIC PROPERTIES GIVING RISE TO THE CLAIM
        DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT FIRST GIVING
        RISE TO THE CLAIM. MULTIPLE CLAIMS WILL NOT INCREASE THIS LIMIT.
      </li>
      <li>
        <strong>Carve-outs.</strong> Some jurisdictions do not allow the exclusion
        or limitation of certain damages or liabilities; the above limitations will
        apply to you only to the extent permitted by applicable law.
      </li>
    </ol>

    <h2>20) Indemnification</h2>
    <p>
      You will indemnify, defend, and hold harmless the Company and its owners,
      officers, directors, employees, and agents from and against any
      third-party claims, damages, losses, liabilities, costs, and expenses
      (including reasonable attorneys' fees) arising from: (i) your use of the
      Properties; (ii) Your Content or your applications; (iii) your violation
      of these Terms or applicable law; or (iv) any chargebacks or disputes
      initiated in violation of Section 7.6.
    </p>
    <p>
      <strong>Limited IP Indemnity by the Company.</strong> Solely for current-version
      proprietary Software provided by the Company, and only to the extent expressly
      stated in a separate written agreement or applicable order, the Company may
      offer limited indemnification for certain third-party intellectual property
      claims. Any such indemnity is subject to the limitations, exclusions, and procedures
      described in the relevant agreement or order and will not apply to combinations,
      modifications, or uses of the Software that are not in accordance with documentation.
    </p>

    <h2>21) Suspension &amp; Termination</h2>
    <p>
      The Company may suspend or terminate your access to some or all of the
      Properties immediately if: (i) you breach these Terms or any other
      applicable terms; (ii) your use poses a security risk or may adversely
      impact the Properties or others; (iii) required by law or by a
      governmental authority; or (iv) you fail to pay applicable fees when due.
      Upon termination, your right to use the Properties ceases, and you must
      stop using the Properties and delete all copies of the Software and any
      license materials in your possession or control. Termination does not
      relieve you of any payment obligations that arose before termination.
    </p>

    <h2>22) Changes to the Properties &amp; to These Terms</h2>
    <p>
      The Company may update or change the Properties and may amend these Terms
      from time to time. When we do so, we will update the "Last Updated" date
      at the top of these Terms and may provide additional notice where required
      by law. Your continued use of the Properties after changes become
      effective constitutes your acceptance of the updated Terms. If you do not
      agree with the changes, you must stop using the Properties and, where
      applicable, cancel your subscriptions before the next renewal.
    </p>

    <h2>23) Dispute Resolution; Arbitration; Class Waiver; Opt-Out</h2>
    <p>
      <strong>Governing Law &amp; Venue.</strong> Unless otherwise required by mandatory
      local law, these Terms and any disputes arising out of or relating to them
      or the Properties will be governed by the laws of the jurisdiction in which
      the Company is organized or primarily conducts business, without regard to
      conflict of laws principles.
    </p>
    <p>
      <strong>Arbitration.</strong> Except to the extent prohibited by applicable
      law, any dispute arising out of or relating to these Terms or the Properties
      will be resolved by binding arbitration administered by a reputable arbitration
      provider (for example, the American Arbitration Association or JAMS) under
      its applicable rules. Unless otherwise agreed, the seat and location of arbitration
      will be the principal place of business of the Company. Either party may seek
      individual relief in small-claims court where jurisdictionally available.
    </p>
    <p>
      <strong>Class Action &amp; Jury Trial Waiver.</strong> To the maximum extent
      permitted by law, you and the Company waive any right to a jury trial and any
      right to participate in a class, collective, or representative action. Disputes
      will be resolved only on an individual basis.
    </p>
    <p>
      <strong>Opt-Out.</strong> If the arbitration and class-waiver provisions are
      not mandatory under applicable law, you may opt out of them (but not of other
      provisions of these Terms) by sending written notice to the Company within
      thirty (30) days of the date you first accept these Terms. The notice must
      identify you and clearly state your desire to opt out of arbitration. Instructions
      for contacting the Company for this purpose may be provided on the Properties.
    </p>

    <h2>24) Notices; Electronic Communications</h2>
    <p>
      The Company may provide notices by posting them on the Properties, by
      in-product messages, or by sending email to the address associated with
      your account. You agree that these electronic communications satisfy any
      legal requirement that such communications be in writing. You are
      responsible for keeping your contact information current and accurate.
    </p>

    <h2>25) Assignment; Transfer; Successors</h2>
    <p>
      You may not assign or transfer these Terms, by operation of law or
      otherwise, without the Company's prior written consent, and any purported
      assignment or transfer in violation of this restriction will be void. The
      Company may assign or transfer these Terms in whole or in part (for
      example, to an affiliate or in connection with a merger, acquisition,
      corporate reorganization, or sale of assets). These Terms will bind and
      inure to the benefit of the parties and their permitted successors and
      assigns.
    </p>

    <h2>26) Order of Precedence</h2>
    <p>
      If you have a separate signed agreement, statement of work, or data
      processing agreement with the Company that expressly conflicts with these
      Terms, the order of precedence will generally be: (1) the signed agreement
      (including applicable statements of work or data processing agreements);
      (2) these Terms; and (3) any additional documentation or policies
      referenced herein, unless that other agreement expressly provides a
      different order of precedence.
    </p>

    <h2>27) Severability; No Waiver; Entire Agreement</h2>
    <p>
      If any provision of these Terms is held to be unlawful, invalid, or
      unenforceable, that provision will be enforced to the maximum extent
      permissible and the remaining provisions will remain in full force and
      effect. The Company's failure to enforce any provision will not be a
      waiver of the right to enforce it later. These Terms (together with any
      additional terms incorporated by reference) constitute the entire
      agreement between you and the Company regarding the subject matter and
      supersede all prior or contemporaneous understandings.
    </p>

    <h2>28) Survival</h2>
    <p>
      Provisions that by their nature should survive termination of these Terms
      will survive, including but not limited to Sections 3&ndash;5, 7&ndash;10,
      11&ndash;22, 23&ndash;28, and any payment obligations incurred before
      termination.
    </p>
  </div>
</ContentPage>
