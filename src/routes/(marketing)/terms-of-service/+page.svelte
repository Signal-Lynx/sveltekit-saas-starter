<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { SITE_CONFIG } from "../../../config"

  const _lastUpdated = "August 13, 2025"
</script>

<ContentPage
  title={`${SITE_CONFIG.companyLegalName.toUpperCase()} GLOBAL TERMS OF SERVICE & END-USER LICENSE AGREEMENT (TOS/EULA)`}
  description={`The official Global Terms of Service and End-User License Agreement for all ${SITE_CONFIG.companyLegalName} products and properties.`}
>
  <!-- Override the default max-width for this specific, wider legal document -->
  <div class="prose max-w-4xl">
    <p><em>Last Updated: {_lastUpdated}</em></p>

    <h2>1) Introduction & Scope (the “Agreement”)</h2>
    <p>
      These Terms of Service and End-User License Agreement (collectively, the
      “Terms”) are a binding contract between you (“you” or “User”) and Signal
      Lynx Solutions LLC, a Texas limited liability company (“Signal Lynx,”
      “we,” “us,” or “our”). These Terms govern your access to and use of all
      Signal Lynx properties, including: websites, web apps and portals;
      desktop/server/mobile software and installers; setup/configuration
      utilities; APIs and SDKs; back-end services; content, documentation, and
      emails; marketing and communications across all channels (including social
      media, webinars, trade shows, and in-person demos); and contests,
      giveaways, or promotions (collectively, the “Properties”).
    </p>
    <p>
      By creating an account, making a purchase, installing or using any
      Software, or accessing any Property, you agree to these Terms. If you
      accept on behalf of an entity, you represent you have authority to bind
      it.
      <strong>If you do not agree, do not use the Properties.</strong>
    </p>

    <h2>2) Definitions</h2>
    <p>
      <strong>Software:</strong> Any Signal Lynx executable, library, script, configuration
      utility (e.g., Signal Shield), trading relay/execution tools (e.g., Lynx-Relay),
      licensing hub/manager (e.g., Key Commander), and related components.
    </p>
    <p>
      <strong>Subscription:</strong> Time-limited access that auto-renews unless
      canceled.
    </p>
    <p>
      <strong>Perpetual License:</strong> A license without a renewal term (updates/support
      may be time-limited).
    </p>
    <p>
      <strong>Seat / Activation / Machine ID:</strong> License controls that limit
      simultaneous device/user activations; a Machine ID uniquely identifies a device/instance.
    </p>
    <p>
      <strong>User Secrets:</strong> Your private keys, credentials, tokens, or other
      sensitive configuration data under your control.
    </p>
    <p>
      <strong>Community Channels:</strong> Signal Lynx social media, forums, chat
      groups, newsletters, webinars, trade-show sessions, and similar venues.
    </p>

    <h2>3) Privacy, Security & User Secrets</h2>
    <h3>3.1 Incorporated Policies.</h3>
    <p>
      Our use of your information is governed by our Privacy Policy
      (incorporated by reference). If we process personal data on your behalf
      under a separate agreement, our Data Processing Addendum (DPA) (if any)
      also applies.
    </p>
    <h3>3.2 Data We Collect.</h3>
    <p>
      To provide and secure the Properties, we collect limited information,
      which may include:
    </p>
    <ol type="a">
      <li>account identifiers (name, email, region/country);</li>
      <li>
        license and entitlement records (product/plan, term, renewal status,
        activation counts, Machine IDs, anonymized hardware/OS fingerprints);
      </li>
      <li>
        transactional records (purchase dates, amounts, currency, taxes, and
        processor-supplied metadata like brand/last-4—we do not store full card
        numbers);
      </li>
      <li>
        security/operational logs (timestamps, versions, basic success/failure
        codes for install/activation/updates, API rate-limit events);
      </li>
      <li>
        support metadata (ticket ID, your communications, diagnostics you choose
        to provide).
      </li>
    </ol>
    <p>
      We do not monitor your trading activity and do not ingest your trading
      strategies or positions.
    </p>
    <h3>3.3 User Secrets.</h3>
    <p>
      “User Secrets” (e.g., exchange API keys, private tokens, SMTP keys) are
      intended to be stored locally under your control and are not transmitted
      to our servers unless you explicitly send them to us (e.g., within a
      support ticket). If you share any Secret, you must rotate/replace it
      immediately after the ticket. You are solely responsible for safeguarding
      User Secrets and the systems where they are stored.
    </p>
    <h3>3.4 Security of Your Environment.</h3>
    <p>
      You are responsible for OS hardening, firewalls/EDR/AV, access controls,
      credential hygiene, and timely patching. We are not liable for breaches or
      losses arising from your environment, your configurations, or third-party
      accounts.
    </p>
    <h3>3.5 Telemetry (if enabled).</h3>
    <p>
      If an optional telemetry/diagnostics feature is enabled, we will describe
      what is collected and provide an opt-out where feasible. Telemetry, if
      any, will not include User Secrets.
    </p>
    <h3>3.6 Processors & Subprocessors.</h3>
    <p>
      We may use reputable third-party providers (cloud hosting, analytics with
      privacy safeguards, payment processors) to operate the Properties. We
      remain responsible for our processors under applicable law.
    </p>

    <h2>4) License Grant; Ownership; Restrictions</h2>
    <p>
      Subject to your compliance and payment of applicable fees, Signal Lynx
      grants you a limited, non-exclusive, non-transferable, non-sublicensable,
      revocable license to install and use the Software and services you
      purchase or are otherwise lawfully provided, solely for your own lawful
      internal business or personal purposes.
    </p>
    <p>
      <strong>Restrictions.</strong> You will not (and will not permit anyone to):
    </p>
    <ol type="a">
      <li>
        copy (except one backup), modify, translate, or create derivative works
        of the Properties;
      </li>
      <li>
        reverse-engineer, decompile, disassemble, or circumvent license/security
        controls;
      </li>
      <li>
        resell, rent, lease, lend, timeshare, host for third parties, or provide
        the Properties as a service;
      </li>
      <li>
        publish performance/benchmark results without our written consent;
      </li>
      <li>remove/alter proprietary notices;</li>
      <li>
        exceed seats/activations, share keys, or bypass rate limits or intended
        API usage.
      </li>
    </ol>
    <p>
      Signal Lynx and its licensors retain all rights in the Properties. No
      rights are granted except as expressly stated.
    </p>

    <h2>5) Your Content & Feedback</h2>
    <p>
      You retain ownership of content you create or submit. By posting content
      in Community Channels or other public areas, you grant Signal Lynx a
      worldwide, non-exclusive, royalty-free, perpetual license to host,
      display, adapt for technical needs, and distribute that content to operate
      and promote the Properties. Do not post confidential information in public
      areas. Feedback you submit may be used by Signal Lynx without attribution
      or compensation.
    </p>

    <h2>6) Eligibility, Compliance & Export</h2>
    <p>
      You must be 18+ (or age of majority, if higher). You are responsible for
      compliance with all laws that apply to your use. You represent you are not
      on any sanctions/denied-party list and are not in an embargoed country.
      You will not use the Properties for prohibited end uses. Government use is
      subject to restricted rights.
    </p>

    <h2>
      7) Purchases, Billing, Auto-Renewal, Price Changes, Refunds & Chargebacks
    </h2>
    <h3>7.1 Scope.</h3>
    <p>
      These Terms apply to subscriptions, perpetual licenses, upgrades, add-ons,
      digital goods, services, bundles, credits, trials, promotions, and
      physical merchandise.
    </p>
    <h3>7.2 Billing & Auto-Renewal.</h3>
    <p>
      Subscriptions bill in advance and auto-renew for the same term at the
      then-current price unless you cancel in your account before the renewal
      date. Continued subscription and non-cancellation constitute acceptance of
      the new price. Where required by law, we will send renewal or
      price-increase notices; otherwise, changes take effect at the next renewal
      after posting.
    </p>
    <h3>7.3 Taxes & Fees.</h3>
    <p>
      Prices exclude taxes, duties, and processor fees. You are responsible for
      applicable taxes and government charges.
    </p>
    <h3>7.4 Payment Processing by Third Parties.</h3>
    <p>
      All payments are processed by third-party payment processors (e.g.,
      Stripe, PayPal). We do not store full payment card numbers. You authorize
      us to share necessary transaction information with the processor for
      billing, fraud screening, Strong Customer Authentication (SCA/3-D Secure),
      refunds (if any), and compliance. The processor’s terms and privacy policy
      apply to your payment method. We are not liable for processor outages,
      delays, or declines.
    </p>
    <h3>7.5 No Refunds.</h3>
    <p>
      All fees are non-refundable and non-creditable to the maximum extent
      permitted by law. If applicable law grants a statutory
      withdrawal/cooling-off right for digital services, you acknowledge that
      service may begin immediately and you consent to immediate performance and
      waive such withdrawal to the extent permitted. If you do not consent, do
      not access the service until the period ends.
    </p>
    <h3>7.6 Chargebacks & Remedies.</h3>
    <p>
      Contact support to resolve billing issues before initiating a chargeback.
      Chargebacks made without first contacting us are a material breach. You
      agree to reimburse any amounts reversed, processor fees, reasonable
      collection costs, and interest at the lesser of 1.5% per month or the
      maximum allowed by law. We may suspend/terminate access for chargebacks
      and place accounts into collections.
    </p>

    <h2>8) Activations, Machine IDs & Reset Limits</h2>
    <p>
      Licenses may be limited by seats/activations and bound to Machine IDs. We
      may offer self-service activation resets subject to time-based limits and
      anti-abuse controls (e.g., no more than once per defined interval per
      license, as stated in your account portal). Resets are unavailable for
      expired/canceled licenses. We may require verification (e.g., proof of
      hardware change) and may deny suspected abuse.
    </p>

    <h2>9) APIs & Rate Limits</h2>
    <p>
      Use of any Signal Lynx API is subject to published rate limits, auth
      requirements, and security practices. You may not share API credentials,
      scrape, or use automated means beyond permitted limits. We may monitor,
      throttle, suspend, or revoke API access for abuse or security risks.
    </p>

    <h2>10) Third-Party Platforms & Your Integrations</h2>
    <p>
      The Properties may interoperate with third-party platforms (e.g.,
      TradingView, exchanges, Stripe, OS package managers). We do not control
      and are not responsible for third-party services, their outages, terms, or
      policies. You must maintain valid accounts with such providers and comply
      with their terms. If you use our License Manager in software you
      distribute to your users, you are solely responsible for your app and user
      relationships and will indemnify Signal Lynx against related claims.
    </p>

    <h2>11) Promotions, Giveaways, Events & “All-Channels” Marketing</h2>
    <p>
      Promotions (contests, giveaways, trade-show activations, referral
      programs) are governed by Official Rules provided with the Promotion and
      are void where prohibited. We may modify, suspend, or terminate Promotions
      at any time. We may require eligibility verification and tax forms where
      applicable. All communications across all channels—including emails,
      websites, social media, webinars, trade-show talks, and in-person
      demos—are informational/educational only and not financial advice or
      offers to sell securities.
    </p>

    <h2>12) Beta, Trials & Pre-release</h2>
    <p>
      Alpha/beta builds, previews, labs features, or free trials are provided
      “AS IS” and “AS AVAILABLE,” without warranty, support, or liability and
      may be changed or discontinued at any time. They may be unstable and risk
      data loss.
    </p>

    <h2>13) System Configuration Utility (Setup Script)</h2>
    <p>
      The setup/configuration utility (e.g., Signal Shield) modifies system
      settings and installs dependencies.
      <strong>USE AT YOUR OWN SOLE RISK.</strong> You are responsible for full system
      images/backups, OS hardening, firewalls, anti-malware, and compatibility with
      EDR/AV, exchanges, and drivers. We disclaim liability for damage, data loss,
      instability, or incompatibility.
    </p>

    <h2>14) Service Availability, Changes & Support</h2>
    <p>
      We may add, change, or discontinue features or Properties at any time.
      There is no guaranteed uptime or SLA. Outages may occur for maintenance,
      provider failures, DDoS, force majeure, or other reasons (including
      unavailability of key personnel). Support is best-effort via the channels
      listed on our site; response times are not guaranteed.
    </p>

    <h2>14A) License Manager Availability & Your Business Continuity</h2>
    <p>
      <strong>No SLA for Entitlement/Activation.</strong> License activation, entitlement,
      and validation endpoints (whether we host them or you self-host) may be unavailable,
      throttled, modified, or deprecated without notice and may be impacted by third-party
      outages.
    </p>
    <p>
      <strong>Your Redundancy Obligations.</strong> You are solely responsible for
      designing your applications and operations to tolerate temporary unavailability
      of licensing endpoints (e.g., grace modes, local caching, offline checks) appropriate
      to your risk tolerance. We have no duty to provide failover, escrow, uptime
      guarantees, or offline keys unless expressly agreed in a signed writing.
    </p>
    <p>
      <strong>No Credits/Refunds.</strong> No refunds, credits, or extensions are
      provided for downtime or unavailability of license, activation, entitlement,
      or update services, to the maximum extent permitted by law.
    </p>
    <p>
      <strong>Downstream Use.</strong> If you integrate our License Manager into
      software for your users, you are solely responsible for that software and your
      user relationships and will indemnify Signal Lynx against claims arising from
      unavailability or inability to validate a license.
    </p>

    <h2>15) Acceptable Use (AUP) — Prohibited Conduct</h2>
    <p>You will not:</p>
    <ol type="a">
      <li>violate laws or third-party rights;</li>
      <li>
        engage in market manipulation, front-running, wash trading, spoofing, or
        abusive trading practices;
      </li>
      <li>
        conduct high-frequency trading, latency arbitrage, denial-of-service,
        stress tests, or actions that degrade platforms or exchanges;
      </li>
      <li>
        bypass security or license controls; scrape or mine in violation of our
        or third-party terms;
      </li>
      <li>distribute malware/spam;</li>
      <li>harm or exploit minors;</li>
      <li>post illegal, infringing, or defamatory content.</li>
    </ol>
    <p>We may investigate and suspend or terminate for suspected violations.</p>

    <h2>16) DMCA & Copyright Notices</h2>
    <p>
      If you believe content accessible via the Properties infringes your
      copyright, see our DMCA Page on the website for our Designated Agent’s
      current contact details and instructions. We also register our Designated
      Agent with the U.S. Copyright Office’s online directory. Counter-notice
      procedures and repeat-infringer policy are described on that page. (Note:
      We may designate a Registered Agent/third-party address to protect
      personal privacy consistent with DMCA rules.)
    </p>

    <h2>17) Open-Source & Third-Party Components</h2>
    <p>
      Software may include open-source or third-party components under their own
      licenses. Those licenses govern the components. We may provide a
      NOTICE/LICENSES file.
    </p>

    <h2>18) Disclaimers, Risk & Non-Advice</h2>
    <p>
      You use the Properties at your sole risk. Signal Lynx is not a
      broker-dealer, investment adviser, or financial institution. No content is
      financial, legal, or tax advice. Trading and automation involve
      substantial risk, including total loss. You are solely responsible for
      strategies, configuration, risk controls, and outcomes. Communications
      across all channels reflect opinions and may be inaccurate or outdated; do
      your own research.
    </p>

    <h2>19) Limitation of Liability</h2>
    <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
    <ol type="a">
      <li>
        <strong>Exclusion.</strong> SIGNAL LYNX WILL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, COVER, EXEMPLARY, OR PUNITIVE DAMAGES;
        LOST PROFITS/REVENUE/DATA/GOODWILL; BUSINESS INTERRUPTION; OR PROCUREMENT
        OF SUBSTITUTE GOODS/SERVICES—EVEN IF ADVISED OF THE POSSIBILITY.
      </li>
      <li>
        <strong>Cap.</strong> SIGNAL LYNX’S TOTAL LIABILITY ARISING OUT OF OR RELATED
        TO THE PROPERTIES OR THESE TERMS WILL NOT EXCEED THE AMOUNTS YOU PAID TO
        SIGNAL LYNX FOR THE PROPERTIES GIVING RISE TO THE CLAIM IN THE 12 MONTHS
        BEFORE THE EVENT. MULTIPLE CLAIMS DO NOT ENLARGE THE CAP. Without limiting
        the foregoing, we will not be liable for any inability to access or use the
        Software or your applications caused by unavailability of activation, entitlement,
        update, or license-verification services.
      </li>
      <li>
        <strong>Carve-outs.</strong> Some jurisdictions do not allow certain exclusions/limits;
        the above applies to the fullest extent permitted.
      </li>
    </ol>

    <h2>20) Indemnification</h2>
    <p>
      You will indemnify, defend, and hold harmless Signal Lynx and its members,
      officers, and agents from any third-party claims, damages, liabilities,
      costs, and expenses (including reasonable attorneys’ fees) arising from:
      (i) your use of the Properties; (ii) your content or applications; (iii)
      your violation of these Terms or law; or (iv) chargebacks initiated in
      breach of these Terms.
    </p>
    <p>
      <strong>Limited IP Indemnity by Signal Lynx.</strong> Solely for our unmodified,
      current-version proprietary Software as provided by us, we will defend you
      against claims that it directly infringes a third-party U.S. patent, copyright,
      or trade secret and pay final damages awarded, provided you (a) promptly notify
      us; (b) give us sole control of defense; and (c) provide cooperation. We may
      procure rights, modify, or replace the Software; if not feasible, we may refund
      prepaid unused subscription fees and terminate the license. Excludes claims
      based on combinations, modifications, or use not per documentation.
    </p>

    <h2>21) Suspension & Termination</h2>
    <p>
      We may suspend or terminate access for breach, security risks,
      non-payment, or legal requirements. Upon termination, you must cease use
      and delete all copies of Software and license materials. Termination does
      not relieve payment obligations accrued before termination.
    </p>

    <h2>22) Changes to the Properties & to These Terms</h2>
    <p>
      We may update the Properties and amend these Terms at any time. Changes
      are effective upon posting with the “Last Updated” date. Where required by
      law, we will provide notice or obtain consent (e.g., for certain
      auto-renewal changes). Your continued use after changes become effective
      constitutes acceptance. If you do not agree, stop using the Properties and
      cancel any subscription before the next renewal.
    </p>

    <h2>23) Dispute Resolution; Arbitration; Class Waiver; Opt-Out</h2>
    <p>
      <strong>Governing Law & Venue.</strong> Texas law (without conflict rules)
      governs these Terms.
    </p>
    <p>
      <strong>Arbitration.</strong> Any dispute will be resolved by binding arbitration
      in Travis County, Texas, administered by the American Arbitration Association
      (AAA) under its Consumer or Commercial Rules (as applicable). If AAA is unavailable,
      the parties will use JAMS. Either party may seek individual relief in small-claims
      court.
    </p>
    <p>
      <strong>Class Action & Jury Trial Waiver.</strong> You and Signal Lynx waive
      any right to a jury trial or to participate in a class or representative action.
    </p>
    <p>
      <strong>30-Day Opt-Out.</strong> You may opt out of arbitration (but not other
      Terms) by emailing legal@signallynx.com within 30 days of first acceptance
      with your name, account email, and a clear statement opting out.
    </p>

    <h2>24) Notices; Electronic Communications</h2>
    <p>
      We may provide notices by posting to the Properties, by in-product
      messages, or by email to your account address. You consent to electronic
      communications. Keep your contact details current.
    </p>

    <h2>25) Assignment; Transfer; Successors</h2>
    <p>
      You may not assign or transfer these Terms without our prior written
      consent; any attempt is void. We may assign or transfer these Terms
      (including to an affiliate or in connection with a merger, acquisition,
      financing, or asset sale). These Terms bind permitted successors and
      assigns.
    </p>

    <h2>26) Order of Precedence</h2>
    <p>
      If you have a signed agreement, SOW, or DPA with Signal Lynx, and there is
      a conflict, the signed document controls, then these Terms, then
      documentation.
    </p>

    <h2>27) Severability; No Waiver; Entire Agreement</h2>
    <p>
      If any provision is unlawful or unenforceable, it will be limited or
      severed to the minimum extent necessary, and the remainder remains in
      effect. Our failure to enforce a provision is not a waiver. These Terms
      (including incorporated policies) are the entire agreement and supersede
      prior understandings regarding the Properties.
    </p>

    <h2>28) Survival</h2>
    <p>
      Sections that by their nature should survive (including 3–5, 7–10, 11–22,
      23–28) will survive termination.
    </p>
  </div>
</ContentPage>
