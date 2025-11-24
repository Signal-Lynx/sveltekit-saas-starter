# 🛠️ Customization Guide

Welcome, Pilot. This guide will walk you through the key files to edit to rebrand the template, strip out the "Paradox Innovations" theme, and customize it for your own SaaS.

---

## Rebranding Checklist

Follow these steps to customize the template with your own brand, products, and content.

### 1. Configure Core Branding (`src/config.ts`)

This is your main control panel. Open this file to change:

- `WebsiteName`: The name of your site (e.g., "My SaaS").
- `WebsiteBaseUrl`: Your production domain (e.g., `https://my-saas.com`).
- `WebsiteDescription`: The default meta description for SEO.
- **SITE_CONFIG**:
  - `logoPath` & `logoAlt`: Path and alt text for your logo.
  - `companyLegalName`: Your legal company name for documents.
  - `*Email`: All contact emails used across the site (Support, Legal, etc.).
  - `socials`: Links for your social media accounts.
  - `footerNav`: The links that appear in your site's footer.

### 2. Set Your Color Theme (`src/lib/theme.ts`)

This file controls the visual theme. The site uses **DaisyUI**, so changing these hex codes updates the entire UI instantly.

- **Primary:** Your main brand color (Buttons, Headers).
- **Secondary:** Your accent color (cards, highlights).
- **Base-100/200/300:** Your background shades (Light or Dark).

### 3. Define Your Products (`src/lib/data/products.ts`)

This file is the static source of truth for your product offerings.

1.  **Delete** the example products ("Hoverboard Schematics", "Timeline C", "Anti-Gravity Society").
2.  **Add** your own product objects to the `allProducts` array. Each product needs:
    - `id`: Internal ID used for logic (e.g., "pro_plan").
    - `stripe_product_id` & `stripe_price_id`: From your Stripe Dashboard.
    - `stripe_mode`: "payment" (one-time) or "subscription".
3.  **Update Exports:**
    - Modify `displayProducts` or create new exports (e.g., `mySoftwareProducts`) to filter for your new items.
    - Set `defaultPlanId` to the ID of the product you want new users to see first.

### 3.1 (Optional) Dynamic Product Overrides

For more flexibility, you can override product details without a code deployment using the `product_overrides` table in your Supabase database.

- **How it works:** The application checks this table for entries matching a product ID. If found, it uses the DB values instead of the file.
- **Why use it:** Run A/B tests on pricing, temporarily hide a product, or update CTA text instantly.
- **Fallback:** If the DB is empty or unreachable, the site gracefully falls back to `src/lib/data/products.ts`.

### 4. Update Content Pages

This is where you edit the main marketing text.

- **Product Pages:**
  - Delete the example folders: `src/routes/(marketing)/products/hover` and `timeline`.
  - Create your own folders (e.g., `/pricing`, `/features`).
  - Use `src/lib/components/ProductCard.svelte` to easily render pricing cards.
- **Homepage:** Edit `src/routes/(marketing)/+page.svelte` to remove the "Paradox Innovations" hero section and add your own copy.
- **FAQ:** Edit `src/lib/data/faqData.ts`. Remove the "Is the hoverboard real?" jokes and add your actual FAQs.
- **Homepage Features:** Edit `src/lib/data/homepageFeatures.ts` to change the feature cards on the homepage.
- **Legal Pages:** Review and edit `src/routes/(marketing)/legal/` (Terms, Privacy, etc.) to match your jurisdiction.

### 5. Update Static Assets (`/static`)

Manually replace the following files with your own:

- `/static/images/`: Add your logo (`logo.png`) and marketing images.
- `/static/favicon.png`: Your site's favicon.
- `/static/robots.txt`: Update if you have specific SEO needs.
- `/static/.well-known/security.txt`: Update with your security contact info.

### 6. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your keys.

- **Supabase:** Required for Auth and Database.
- **Stripe:** Required for billing.
- **License Manager:** Required if you are using Key Commander.
- **AWS SES:** Optional, for sending emails.
- **Cloudflare R2:** Required if you are selling digital downloads.

### 7. Digital Downloads (Cloudflare R2)

If you are selling files (like software installers or PDFs):

1.  **Bucket Setup:** Create a private bucket in Cloudflare R2.
2.  **Folder Structure:** Organize files by product ID (e.g., `my-app/v1.0/installer.exe`).
3.  **Update Config:**
    - Open `src/config.ts` and update `DOWNLOAD_PREFIXES`.
    - Map your product IDs to these folder prefixes.
4.  **Env Vars:** Ensure `PRIVATE_R2_BUCKET_NAME` is set in `.env`.

---

## 8. Key Commander Integration

This template is the official frontend for **Key Commander**.

- If you are using Key Commander, set `PRIVATE_LICENSE_MANAGER_URL` and `PRIVATE_LICENSE_MANAGER_API_KEY` in `.env`.
- The dashboard (`/account`) will automatically fetch license keys for the logged-in user based on their email.
- **Important:** Ensure the `Product ID` in Key Commander matches the `id` you set in `src/lib/data/products.ts`.
