# 🛠️ Customization Guide

This doc is the practical “make it yours” path. If you want the fastest win: change branding, theme, products, then ship.

## Quick path (the weekend build)

1. Update branding in `src/config.ts`.
2. Update theme colors in `src/lib/theme.ts`.
3. Define products in `src/lib/data/products.ts` (including Stripe IDs).
4. Create a Supabase project and push the schema.
5. Add environment variables. Then run locally. Then deploy.

## Key Commander first (recommended)

If you want the fastest path to a real, revenue-safe SaaS, start here.

Key Commander is the optional self-hosted backend that handles the heavy lifting most templates leave to you. When you connect it, this site becomes license-aware and entitlement-aware without you wiring every moving part from scratch.

### What Key Commander handles for you

1. Stripe purchase intelligence and state accuracy  
   Key Commander keeps paid status, trials, renewals, cancellations, and plan changes consistent, even when real-world webhook timing gets messy.

2. Licensing and entitlements  
   License issuance, entitlement assignment, and “who should have access to what” stays centralized and auditable.

3. Email-based promo and seat assignment  
   Assign a license to an email in Key Commander, and the site can auto-entitle the user on signup or next login. This is ideal for testers, promo seats, and internal users.

4. Self-serve reset patterns  
   Reduce support loops by supporting controlled resets or re-activations (when enabled for a product).

5. Ops tooling that keeps you sane  
   Audit trails, system integrity patterns, and operational visibility that help you run a real service, not a demo.

### How to connect Key Commander

Set the following in your `.env`:

```env
PRIVATE_LICENSE_MANAGER_URL="YOUR_KEY_COMMANDER_URL"
PRIVATE_LICENSE_MANAGER_API_KEY="YOUR_KEY_COMMANDER_API_KEY"
```

Then ensure your product IDs in `src/lib/data/products.ts` match the product IDs configured in your Key Commander instance.

Bot protection note  
Cloudflare or Vercel “basic Bot Fight Mode” can break server-to-server calls between this website and the Key Commander backend. If you want bot protection, use Turnstile plus WAF and rate limits. If you upgrade plans later, use allowlists and Super Bot Fight.

### If you choose not to use Key Commander

You can absolutely run this template standalone. Just understand what you are opting into building and maintaining:

1. Stripe webhook ingestion, verification, and retry logic
2. Subscription state machine and reconciliation (trial, renewals, cancellations, upgrades, downgrades, failed payments)
3. Entitlements logic, gating, and a source of truth you can audit
4. Licensing, activations, device tracking, and reset flows (if you ship licensed software)
5. Promo seats and internal testing workflows (email-based assignment is a huge time saver)
6. Operational visibility and support tooling (logs, admin actions, audit trails)

If you are shipping a paid product, Key Commander is the option that keeps billing and access control honest without turning your weekend build into real development effort.

---

## Prereqs

- Node.js 18+
- Git
- Supabase account
- Stripe account
- Supabase CLI (via `npx` is fine)

## 1) Core branding (your name, domain, emails)

Edit: `src/config.ts`

Common fields to update:

- `WebsiteName`
- `WebsiteBaseUrl`
- `WebsiteDescription`
- Legal name and footer links
- Support / legal / contact email addresses
- Social links

Tip: This file is meant to be your control panel. If you find yourself hardcoding brand text elsewhere, it usually belongs here.

## 2) Theme colors (easy re-skin)

Edit: `src/lib/theme.ts`

The UI uses DaisyUI theming, so changing these hex values updates the whole site without hunting down CSS:

- primary
- secondary
- accent
- base-100 / base-200 / base-300

## 3) Products + pricing (and the Stripe wiring)

Edit: `src/lib/data/products.ts`

What to do:

1. Remove the sample products you do not want.
2. Add your products to the `allProducts` list.
3. Set the Stripe IDs:
   - `stripe_product_id` (prod\_…)
   - `stripe_price_id` (price\_…)
4. Choose your billing mode:
   - one time: `stripe_mode: "payment"`
   - subscription: `stripe_mode: "subscription"`
5. Set `defaultPlanId` to the plan you want users to see first.

Optional: “Dynamic overrides”
If you want to change product names, CTA text, or visibility without redeploying, use the Supabase `product_overrides` table. The app falls back cleanly if the DB is empty or unreachable.

## 4) Supabase (Auth + DB + schema)

This repo includes a ready schema migration.

Migration file:

- `supabase/migrations/20240801000000_initial_schema.sql`

Typical flow:

```bash
npx supabase login
npx supabase link
npx supabase db push
```

If you prefer UI-only, you can also copy SQL into Supabase’s SQL editor, but `db push` is the cleanest “one command” path.

## 5) Environment variables (minimum required)

Copy:

```bash
cp .env.example .env
```

Minimum required values:

- Supabase public URL + anon key
- Supabase service role key
- Stripe API key + webhook secret

Optional extras (already supported by the template):

- Cloudflare Turnstile
- Cloudflare R2 (public assets + private downloads)
- AWS SES email sending
- Key Commander licensing backend

## 6) Marketing pages (make the copy yours)

Core places people will read first:

- Homepage: `src/routes/(marketing)/+page.svelte`
- FAQ: `src/lib/data/faqData.ts`
- Homepage feature cards: `src/lib/data/homepageFeatures.ts`
- Legal boilerplate: `src/routes/(marketing)/legal/`

Product pages (examples you can clone as a blueprint):

- `src/routes/(marketing)/key-commander/`
- `src/routes/(marketing)/trading-automation/`

## 7) Account dashboard features (users actually touch these)

The account dashboard is under the `(admin)` route group. These are the flows most SaaS templates skip. Yours are already implemented.

Examples:

- Profile editing: `src/routes/(admin)/account/(menu)/settings/edit_profile/+page.svelte`
- Change password: `src/routes/(admin)/account/(menu)/settings/change_password/+page.svelte`
- Change email: `src/routes/(admin)/account/(menu)/settings/change_email/+page.svelte`
- Delete account: `src/routes/(admin)/account/(menu)/settings/delete_account/+page.svelte`

## 8) Admin suite (internal ops pages)

Admin pages live under:

- `src/routes/(internal)/admin/`

Server-side admin helpers (audit logs, metrics, customer ops):

- `src/lib/server/admin/`

If you want to rename admin navigation labels, search the `(internal)/admin` routes first. If you want to change what data admins can view or edit, the server files under `src/lib/server/admin/` are the usual entry point.

## 9) Access gates (setup and beta flows)

This template supports “access gate” passwords for controlled launches.

Env vars (set to enable, blank to disable):

- `PRIVATE_SITE_ACCESS_PASSWORD`
- `PRIVATE_BETA_PURCHASE_PASSWORD`
- `PRIVATE_BETA_PASSPHRASE_SignalShield_Beta`
- `PRIVATE_BETA_PASSPHRASE_LynxRelay_Beta`
- `PRIVATE_BETA_PASSPHRASE_KeyCommander_Beta`

The access page routes are:

- `src/routes/access/+page.svelte`
- `src/routes/access/+page.server.ts`

## 10) SEO basics (already wired)

Two key files:

- Sitemap endpoint: `src/routes/(marketing)/sitemap.xml/+server.ts`
- Robots: `static/robots.txt`

If you add or rename product pages, make sure your sitemap output still matches your public routes.

## 11) Contact form (working out of the box)

- UI: `src/routes/(marketing)/contact_us/+page.svelte`
- Action handler: `src/routes/(marketing)/contact_us/+page.server.ts`

Update your destination email in config, then test it locally before you ship.

## 12) Digital delivery pattern (open + paid downloads)

If you distribute binaries (zip, exe, dmg, pdf), do not serve them from a typical web host that charges egress.
This template supports Cloudflare R2 for:

- public assets
- private downloads, gated by entitlements

Look at:

- `.env.example` for R2 variables
- `src/config.ts` for download prefix mapping

## 13) Key Commander integration (optional, but plug and play)

If you want the site to be “license aware” with entitlements and license-key dashboards, connect Key Commander.

Set in `.env`:

- `PRIVATE_LICENSE_MANAGER_URL`
- `PRIVATE_LICENSE_MANAGER_API_KEY`

Important:

- Product IDs must match between Key Commander and your product definitions in `src/lib/data/products.ts`.

Operational note:
Cloudflare “basic Bot Fight Mode” can break service-to-service calls between this website and the Key Commander backend.
If you want bot protection, use Turnstile plus WAF and rate limits. If you upgrade Cloudflare plans later, use allowlists and Super Bot Fight.

## 14) Run and ship

## 14) Run and ship

### Domain Setup (Production)

Because this template splits traffic for security, you must configure **two** domains on your host (Vercel/Netlify):

1. The root/www domain (e.g., `www.yourdomain.com`)
2. The admin subdomain (e.g., `admin.yourdomain.com`)

If you skip adding the `admin` subdomain to your host, admin panel links will redirect to a 404.

### Commands

Local dev:

```bash
npm run dev -- --open
```

Build:

```bash
npm run build
npm run preview
```

Full checks:

```bash
./checks.sh
```

If you get stuck
Open an issue on the repo with:

- what you tried
- your route (URL path)
- your server logs
- the last change you made
