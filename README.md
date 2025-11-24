Paradox Innovations (SaaS Starter Template)

<p align="center">
<strong>A Production-Ready SvelteKit SaaS Template for the Bold.</strong>
</p>
<p align="center">
<a href="https://github.com/Signal-Lynx/sveltekit-saas-starter/actions"><img src="https://img.shields.io/badge/Build-Passing-success" alt="Build Status"></a>
<a href="https://github.com/Signal-Lynx/sveltekit-saas-starter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License"></a>
</p>
🧪 What is this?
This is a full-stack SaaS starter kit built with SvelteKit, Supabase, and Stripe.

It comes pre-loaded with a fictional brand, "Paradox Innovations", selling sci-fi products (Hoverboard Schematics and Timeline Access). This isn't just a Lorem Ipsum placeholder—it's a fully functional example showing:

One-Time Purchases: Digital downloads via secure Cloudflare R2 links.

Subscriptions: Recurring billing with Stripe.

Bundling Logic: How to give subscribers free access to one-time products.

Gated Access: A secure user dashboard that only shows products the user owns.

It is designed to work seamlessly with Key Commander (a self-hosted license manager), but it works perfectly fine as a standalone SvelteKit + Stripe starter.

⚡ Tech Stack
Framework: SvelteKit 5

Styling: Tailwind CSS with DaisyUI

Backend & Auth: Supabase (PostgreSQL, Auth)

Payments: Stripe

Deployment: Cloudflare Pages (or any Node.js environment)

Testing: Vitest & Playwright

🚀 Getting Started
This guide walks you through running a full local copy of the template.

Prerequisites
Node.js (v18 or higher)

Git

Supabase account

Supabase CLI (via npx)

1. Clone & Install Dependencies
   code
   Bash

# Clone the repository

git clone https://github.com/Signal-Lynx/sveltekit-saas-starter.git
cd sveltekit-saas-starter

# Install dependencies

npm install 2) Set Up Your Supabase Backend
Your local app uses a cloud Supabase project for database and authentication.

code
Bash

# Log in to the Supabase CLI (if you haven't already)

npx supabase login

# Link your local repository to your Supabase project

# You'll be prompted to select a project from your account

npx supabase link

# Push the database schema to your Supabase project

# Executes the migrations in supabase/migrations to set up your tables

npx supabase db push 3) Configure Environment Variables
Create a local environment file and fill in required values.

code
Bash
cp .env.example .env
Now open .env and add the following (from your Supabase dashboard → Project Settings → API):

code
Env
PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
PRIVATE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
PRIVATE_SUPABASE_SERVICE_ROLE="YOUR_SUPABASE_SERVICE_ROLE_KEY"
You will also need to add your Stripe Test Keys and AWS SES Credentials (if sending email) to the .env file.

4. Run the Development Server
   code
   Bash
   npm run dev -- --open
   Your local instance should now be running (typically at http://localhost:5173) and connected to your Supabase backend.

🛠️ Customization (De-Paradox Your App)
We built this with a "Cleave & Leave" philosophy. You can strip out the sci-fi theme in about 15 minutes.

1. Rename Your Company
   Edit src/config.ts. Change WebsiteName, CompanyLegalName, and the contact emails. The entire site pulls from this file.

2. Change the Colors
   Edit src/lib/theme.ts. Change the primary and secondary hex codes. The entire UI (buttons, nav bars, accents) will update instantly via DaisyUI.

3. Define Your Products
   Edit src/lib/data/products.ts.

Delete the "Hoverboard" and "Timeline C" entries.

Add your own products.

Update your Stripe Price IDs.

4. Update Content
   Home Page: Edit src/routes/(marketing)/+page.svelte.

FAQs: Edit src/lib/data/faqData.ts.

Features: Edit src/lib/data/homepageFeatures.ts.

For a detailed guide, see CUSTOMIZATION.md.

🔑 Key Commander Integration
This template is the official frontend for Key Commander.

If you are using Key Commander to manage your software licenses:

Set PRIVATE_LICENSE_MANAGER_URL and PRIVATE_LICENSE_MANAGER_API_KEY in your .env.

Ensure your Product IDs in src/lib/data/products.ts match the Product IDs in your Key Commander instance.

The dashboard will automatically fetch and display license keys for your users.

📜 Available Scripts
npm run dev — Starts the local development server.

npm run build — Builds the application for production.

npm run preview — Previews the production build locally.

npm run check — Runs the Svelte type-checker.

npm run lint — Checks for linting issues.

npm run format — Formats code (Prettier).

npm run test — Runs Vitest tests in watch mode.

npm run test:run — Runs all Vitest tests once.

npm run test:e2e — Runs end-to-end tests with Playwright.

./checks.sh — Runs format, lint, check, and tests in sequence.

License
This project is licensed under the MIT License. See the LICENSE file for details.
