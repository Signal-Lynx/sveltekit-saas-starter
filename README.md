# SvelteKit SaaS Starter (Key Commander-ready)

A production-ready SvelteKit SaaS starter with Supabase Auth + Postgres, Stripe billing, entitlement-based access, an admin suite you can actually run, and secure delivery workflows for free and paid assets

The template ships with a fictional brand (“Paradox Innovations”) so you can see real flows, and better understand this website template. Allowing you to quickly “de-Paradox” the template, and make it your own.

Links
• Template repo: https://github.com/Signal-Lynx/sveltekit-saas-starter  
• Signal Lynx: https://signallynx.com  
• Key Commander: https://www.signallynx.com/key-commander  
• Key Commander ReadMe (PDF): https://www.signallynx.com/docs

---

## Why we built this template

This template is meant to be your launchpad. A real, working foundation for the Night Shift Nation. Building after hours (while highly caffeinated) and needing something complete and reliable. With this template (and optional Key Commander integration), a viable storefront and dashboard can be stood up in a weekend. The backend mechanics are already here. Bring your product, voice, and branding.

---

## Template Origin

This template is derived from a production SaaS implementation. It’s a cleaned, generalized version of real flows that were built to run under load, handle billing state correctly, and support real customer ops.

---

## What you get

### Core product flows

1. Supabase Auth, protected routes, dashboards
2. Stripe subscriptions and one-time purchases
3. Product definitions, entitlement checks, and bundling logic
4. Digital-download delivery pattern (secure link approach)
5. User profile self-configuration

### Account lifecycle (working)

Password reset and change, email change, and account deletion flows are wired and working.

### Admin suite (working)

Admin pages are included so you can operate without duct tape:

1. Manage users and user settings
2. Review and manage subscription state
3. Send emails to users from the admin suite
4. Admin audit log for accountability
5. Basic revenue metrics (MRR/ARR style snapshots)

### Production extras

This template includes the boring but critical stuff so you don’t ship a fragile demo.

1. Branding and theme templating (easy color swaps)
2. SEO-ready defaults (metadata patterns, crawl controls)
3. Checkout hardening (tax handling, Terms acceptance, promo codes)
4. Fail-safe checkout gating when the entitlement backend is down
5. Turnstile support, secure download helpers, sitemap exclusions, and a working contact form
6. Legal boilerplate pages (Privacy, Terms, DMCA, and more) with crawl safeguards

---

## Key Commander integration (recommended)

If you want the plug and play path, pair this template with Signal Lynx Key Commander.

Key Commander is the self-hosted backend engine that keeps your business state correct. Stripe events, paid status, trials, entitlements, license issuance, delivery, and ongoing reconciliation are handled by a single system you control. This template becomes the storefront and dashboard on top.

### What Key Commander gives you (beyond this website)

1. Revenue Ops (“Robotic Accountant”)  
   Subscriptions, trials, one-time sales, and reconciliation to keep billing state accurate.

2. Application Intel (“Comms Relay”)  
   Targeted announcements plus detailed audit logs so your stack is not a black box.

3. System Armor  
   Backups, integrity checks, and anti-piracy tooling designed to run on autopilot.

4. Flight Recorder  
   Website and client apps can send logs to your server so you can diagnose issues fast.

### What pairing Key Commander with this template adds

When Key Commander is connected, this site becomes license aware:

1. License-backed entitlements so dashboards unlock based on live license and billing status
2. Email-based entitlement assignment for promo and dev workflows  
   Assign a license to an email in Key Commander, and the site auto-entitles that user on signup or next login.
3. Customer self-service patterns for gated downloads and activation or machine reset workflows (where enabled)

### Key Commander connection (env)

If you want license keys and license-based entitlements in the user dashboard using Key Commander, add these to your `.env`:

```env
PRIVATE_LICENSE_MANAGER_URL="YOUR_LICENSE_MANAGER_URL"
PRIVATE_LICENSE_MANAGER_API_KEY="YOUR_LICENSE_MANAGER_API_KEY"
```

Then ensure your product IDs in `src/lib/data/products.ts` match the product IDs configured for your Key Commander Alias, and your custom/shipable software.

### Security templates included

Key Commander includes deployment guardrails and templates so you don’t wing it:

1. Cloudflare Tunnel configuration templates with explicit hostname and path routing
2. Default-deny edge posture with allowlisted routes
3. Practical WAF and rate-limit recipes for sensitive endpoints

Bot protection note: “Basic Bot Fight Mode” (Cloudflare or Vercel) can break server-to-server calls between this site and Key Commander. If you want bot protection, use a tier that supports allowlists, or leave bot fight off and rely on WAF rules, rate limits, and Turnstile.

Community note: You can absolutely run this template without Key Commander. We’re releasing it free because we want builders to ship faster. If you go standalone, you’ll implement your own licensing and Stripe reconciliation path. Either way, we’ll help where we can. We want to see what the Night Shift Nation builds.

---

## Tech stack

Framework: SvelteKit 5  
Styling: Tailwind CSS + DaisyUI  
Auth + DB: Supabase (Postgres + Auth)  
Payments: Stripe  
Licensing backend (optional): Signal Lynx Key Commander  
Testing: Vitest + Playwright  
Deploy: Cloudflare Pages, Vercel, or any Node.js host

---

## Deployment Architecture (Important)

This template uses a **Domain Split** security pattern in production:

1.  **Main Domain** (`www.yourdomain.com`): Hosting the public marketing site and user dashboard.
2.  **Admin Domain** (`admin.yourdomain.com`): Hosting the internal admin panel.

**Why?**
This allows you to keep your main domain compatible with hosts like Vercel (which prefer "DNS Only" / Grey Cloud), while routing your sensitive Admin panel through Cloudflare's Proxy (Orange Cloud) to enable Zero Trust, strict WAF rules, and IP locking without breaking your public site.

**Configuration Requirements:**

1.  **Hosting:** Add **both** `www.yourdomain.com` and `admin.yourdomain.com` as custom domains in your hosting project (Vercel/Netlify/Cloudflare Pages).
2.  **DNS:**
    - `www`: DNS Only (Grey Cloud) recommended for Vercel.
    - `admin`: Proxied (Orange Cloud) recommended for security.
3.  **Environment:** Set `PUBLIC_WEBSITE_BASE_URL` to your main URL (e.g., `https://www.yourdomain.com`). The app will automatically derive the admin domain (`admin.yourdomain.com`) from this.

---

## Quick start (local dev)

### Prereqs

Node.js 18+  
Git  
Supabase account  
Stripe account  
Supabase CLI (via npx)

### 1) Clone and install

```bash
git clone https://github.com/Signal-Lynx/sveltekit-saas-starter.git
cd sveltekit-saas-starter
npm install
```

### 2) Link Supabase and push schema

```bash
npx supabase login
npx supabase link
npx supabase db push
```

### 3) Configure environment

```bash
cp .env.example .env
```

Minimum required Supabase values (Supabase Dashboard → Project Settings → API):

```env
PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"

PRIVATE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PRIVATE_SUPABASE_SERVICE_ROLE="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

Then add your Stripe keys and webhook secret for billing flows, plus any extras (Turnstile, R2, email, analytics).

Stripe note: subscription state only stays accurate if your Stripe webhook endpoint is configured and receiving events.

### 4) Run dev server

```bash
npm run dev -- --open
```

---

## Customization

### Rename your company

Edit `src/config.ts` and update your site name, legal name, and contact emails.

### Change theme colors

Edit `src/lib/theme.ts` and update the primary and secondary hex values. DaisyUI updates the UI system-wide.

### Define your products

Edit `src/lib/data/products.ts`:

1. Remove the example products
2. Add your real products
3. Update Stripe price IDs to match your Stripe setup

### Update marketing content

Edit:
• Home page: `src/routes/(marketing)/+page.svelte`  
• FAQs: `src/lib/data/faqData.ts`  
• Features: `src/lib/data/homepageFeatures.ts`

For deeper guidance, see `CUSTOMIZATION.md`.

---

## Scripts

```bash
npm run dev        # Start the local dev server
npm run build      # Build for production
npm run preview    # Preview production build

npm run check      # Svelte type-check
npm run lint       # Lint
npm run format     # Prettier format
npm run test       # Vitest watch mode
npm run test:run   # Vitest once
npm run test:e2e   # Playwright e2e

./checks.sh        # Format + lint + check + tests
```

---

## Documentation (extras)

Email setup: `email_docs.md`  
Analytics setup: `analytics_docs.md`

---

## License

MIT. See `LICENSE`.

---

## Maintained by

Signal Lynx, builders of self-hosted automation and licensing tools.  
Company site: https://www.signallynx.com

---

## Search terms (for discoverability)

SvelteKit SaaS starter, Supabase Auth, Stripe subscriptions, Stripe webhooks, one-time purchases, entitlements, admin dashboard, Cloudflare Turnstile, Cloudflare R2 downloads, Cloudflare Pages deploy, SaaS template, boilerplate, Signal Lynx, SignalLynx, Signal-Lynx, KeyCommander, Key Commander, Key-Commander, NightShiftNation.
