// FILE: src/lib/data/products.ts

import { dev } from "$app/environment"

// ====================================================================================
// HOW TO CUSTOMIZE PRODUCTS FOR YOUR TEMPLATE
// ====================================================================================
//
// 1. EDIT THE `Product` TYPE
//    - Add or remove fields to match the data your application needs.
//
// 2. DELETE THE EXAMPLE PRODUCTS
//    - The products defined below (Hoverboard, Timeline C) are examples.
//      You should delete them and replace them with your own.
//
// 3. ADD YOUR OWN PRODUCTS
//    - Create your own product objects inside the `allProducts` array.
//
// 4. UPDATE THE EXPORTED VIEWS
//    - Modify the exports at the bottom (`hoverProducts`, `timelineProduct`) to
//      filter or select YOUR products for specific pages.
//
// 5. SET THE DEFAULT PLAN
//    - Change `defaultPlanId` to the `id` of the product you want new users to see first.
//
// ====================================================================================

export type Product = {
  id: string
  href: string
  name: string
  title: string
  tagline: string
  features: string[]
  price: string
  ctaLabel: string
  footnote: string
  stripe_product_id?: string
  stripe_price_id?: string
  stripe_mode?: "payment" | "subscription"
  hidden?: boolean
}

export const allProducts: Product[] = [
  // --- Product A: One-Time Purchase (Hoverboard Schematics) ---
  {
    id: "hoverboard",
    href: "/products/hover",
    name: "Hover Conversion Schematics",
    title: "Gravity is Optional",
    tagline: "Why roll when you can float? Detailed plans for magnet-taping.",
    features: [
      "The Anti-Gravity Whitepaper (PDF)",
      "High-Res 'Pit Bull' Decal Set",
      "Theoretical Math Included",
      "Does not work on water",
      "Digital Download Only",
    ],
    price: "$10 one-time",
    ctaLabel: "Download Schematics",
    footnote: "Batteries not included.",
    // Template users will replace these keys with their own Stripe IDs
    stripe_product_id: "prod_template_hover_A",
    stripe_price_id: "price_template_hover_A",
    stripe_mode: "payment",
  },

  // --- Product B: Subscription (Anti-Gravity Society) ---
  {
    id: "antigrav",
    href: "/products/hover",
    name: "The Anti-Gravity Society",
    title: "Elite Firmware Access",
    tagline: "Join the club. Get monthly firmware updates for your board.",
    features: [
      "Includes Schematics for FREE",
      "Monthly Firmware Updates",
      "Access to the Zero-G Lounge",
      "Priority quantum support",
      "Cancel before the timeline resets",
    ],
    price: "$10 / month",
    ctaLabel: "Join the Society",
    footnote: "7-day trial. Don't look down.",
    stripe_product_id: "prod_template_society_B",
    stripe_price_id: "price_template_society_B",
    stripe_mode: "subscription",
  },

  // --- Product C: Subscription (Timeline C) ---
  {
    id: "timeline_c",
    href: "/products/timeline",
    name: "Timeline C Access Pass",
    title: "A Better Reality",
    tagline:
      "This timeline is buggy. Upgrade to one where code compiles instantly.",
    features: [
      "Access to 'Master Control' Dashboard",
      "Coffee is free in this dimension",
      "No merge conflicts, ever",
      "Dedicated server resources",
      "Self-hosted sanity",
    ],
    price: "$25 / month",
    ctaLabel: "Switch Timelines",
    footnote: "Warning: May cause dizziness.",
    stripe_product_id: "prod_template_timeline_C",
    stripe_price_id: "price_template_timeline_C",
    stripe_mode: "subscription",
  },

  // --- Hidden "Bonus" Product Logic ---
  // This entry exists to support the logic where buying the "Society" subscription
  // automatically grants the "Hoverboard" one-time product.
  // It effectively says: "If the user has the 'Free Bundle Price', they own the 'hoverboard' product."
  {
    id: "hoverboard", // Matches the ID of Product A
    href: "/products/hover",
    name: "Hoverboard Schematics (Included)",
    title: "Included with Society Membership",
    tagline: "The Schematics - Included Free",
    features: [],
    price: "$0",
    ctaLabel: "",
    footnote: "",
    stripe_product_id: "prod_template_hover_bundle",
    stripe_price_id: "price_template_hover_free_bundle",
    stripe_mode: "payment",
    hidden: true,
  },
]

// ====================================================================================
// DERIVED VIEWS & EXPORTS
// ====================================================================================

/** All visible products (filters out the hidden bundle logic items) */
export const displayProducts: Product[] = allProducts.filter((p) => !p.hidden)

/** Used for the main 'Products' page or Pricing Module */
export const mainProducts: Product[] = displayProducts

/** Specific view for the "Hover Tech" page (combines One-Time + Sub) */
export const hoverProducts = displayProducts.filter(
  (p) => p.id === "hoverboard" || p.id === "antigrav",
)

/** Specific view for the "Timeline C" page */
export const timelineProduct =
  displayProducts.find((p) => p.id === "timeline_c") || displayProducts[0]

// Legacy export aliases to keep the build passing if old files reference them
// (These can be removed once you delete the old routes)
export const automationProducts = hoverProducts
export const licenseHubProduct = timelineProduct

/** The default plan ID for new users (e.g., on sign-up) */
export const defaultPlanId = "antigrav"

// ====================================================================================
// VALIDATION (Dev Only)
// ====================================================================================

if (dev) {
  const seen = new Set<string>()
  // Ensure we don't have duplicate visible IDs which might confuse the UI
  for (const p of displayProducts) {
    if (seen.has(p.id)) {
      console.warn(
        `[products.ts] Duplicate visible product ID detected: ${p.id}`,
      )
    }
    seen.add(p.id)
  }
}
