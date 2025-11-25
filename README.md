Paradox Innovations (SaaS Starter Template) - By Signal Lynx
A production-ready SvelteKit SaaS template for building modern SaaS products.

Build status and license details are available via the repository badges and LICENSE file.

---

## What is this?

This is a full-stack SaaS starter kit built with SvelteKit, Supabase, and Stripe.

It comes pre-loaded with a fictional brand, "Paradox Innovations", selling sci-fi products (Hoverboard Schematics and Timeline Access). This is not just placeholder text; it is a functional example that shows:

- One-time purchases for digital downloads via secure Cloudflare R2 links.
- Subscriptions and recurring billing with Stripe.
- Bundling logic to give subscribers free access to one-time products.
- Gated access with a user dashboard that only shows products the user owns.

The template is designed to work seamlessly with Key Commander (a self-hosted license manager), but it also works fine as a standalone SvelteKit + Stripe starter.

---

## Tech stack

- Framework: SvelteKit 5
- Styling: Tailwind CSS with DaisyUI
- Backend and auth: Supabase (PostgreSQL, Auth)
- Payments: Stripe
- Deployment: Cloudflare Pages (or any Node.js environment)
- Testing: Vitest and Playwright

---

## Getting started

This section walks you through running a full local copy of the template.

Prerequisites:

- Node.js (v18 or higher)
- Git
- Supabase account
- Supabase CLI (via npx)

1. Clone and install dependencies

Run these commands in your terminal:

```bash
git clone https://github.com/Signal-Lynx/sveltekit-saas-starter.git
cd sveltekit-saas-starter

npm install
```

2. Set up your Supabase backend

Your local app uses a cloud Supabase project for database and authentication.

```bash
# Log in to the Supabase CLI (if you haven't already)
npx supabase login

# Link your local repository to your Supabase project
# You will be prompted to select a project from your account
npx supabase link

# Push the database schema to your Supabase project
# This executes migrations in supabase/migrations to set up your tables
npx supabase db push
```

3. Configure environment variables

Create a local environment file and fill in the required values:

```bash
cp .env.example .env
```

Now open the .env file and add the following values (from your Supabase dashboard → Project Settings → API):

```env
PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"

PRIVATE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PRIVATE_SUPABASE_SERVICE_ROLE="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

You will also need to add your Stripe test keys and AWS SES credentials (if you are sending email) to the .env file.

4. Run the development server

```bash
npm run dev -- --open
```

Your local instance should now be running (typically at http://localhost:5173) and connected to your Supabase backend.

---

## Customization (De-Paradox your app)

This template is built using a "Cleave and Leave" approach. You can remove the sci-fi theme and plug in your own brand quickly.

1. Rename your company

Edit the file:

- src/config.ts

Update the following:

- WebsiteName
- CompanyLegalName
- Contact emails

Most of the site pulls these values from this config file.

2. Change the colors

Edit the file:

- src/lib/theme.ts

Update the primary and secondary hex codes. The UI (buttons, navigation bars, accents) will update via DaisyUI.

3. Define your products

Edit the file:

- src/lib/data/products.ts

Actions you should take:

- Remove the example products such as "Hoverboard" and "Timeline C".
- Add your own products.
- Update the Stripe price IDs to match your Stripe setup.

4. Update content

Edit these files:

- Home page: src/routes/(marketing)/+page.svelte
- FAQs: src/lib/data/faqData.ts
- Features: src/lib/data/homepageFeatures.ts

For a more in-depth guide, refer to the CUSTOMIZATION.md file in the repository.

---

## Key Commander integration

This template is the official frontend for Key Commander.

If you are using Key Commander to manage software licenses, do the following:

1. Add the following values to your .env file:

```env
PRIVATE_LICENSE_MANAGER_URL="YOUR_LICENSE_MANAGER_URL"
PRIVATE_LICENSE_MANAGER_API_KEY="YOUR_LICENSE_MANAGER_API_KEY"
```

2. Ensure that the product IDs in:

- src/lib/data/products.ts

match the product IDs in your Key Commander instance.

When configured correctly, the dashboard will automatically fetch and display license keys for your users.

---

## Available scripts

The following scripts are available in the project:

```bash
npm run dev        # Start the local development server
npm run build      # Build the application for production
npm run preview    # Preview the production build locally

npm run check      # Run the Svelte type-checker
npm run lint       # Check for linting issues
npm run format     # Format code using Prettier

npm run test       # Run Vitest tests in watch mode
npm run test:run   # Run all Vitest tests once
npm run test:e2e   # Run end-to-end tests with Playwright

./checks.sh        # Run format, lint, check, and tests in sequence
```

---

## License

This project is licensed under the MIT License. See the LICENSE file in this repository for full details.
