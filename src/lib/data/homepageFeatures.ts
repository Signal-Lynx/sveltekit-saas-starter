export interface FeatureShowcaseItem {
  title: string
  description: string
  details: string[]
}

export const featureShowcase: FeatureShowcaseItem[] = [
  {
    title: "Supersonic Deployment",
    description:
      "Don't spend months building a landing page. This template is pre-fueled and on the runway. Clone, config, deploy.",
    details: [
      "SvelteKit 5 + TailwindCSS.",
      "Pre-configured Stripe Integration.",
    ],
  },
  {
    title: "The Black Box Backend",
    description:
      "Powered by Key Commander. It records everything, handles licenses, and manages users so you don't have to.",
    details: ["Self-Hosted License Management.", "Automated Email Dispatch."],
  },
  {
    title: "Fortified Cockpit",
    description:
      "User authentication via Supabase is pre-wired. Secure dashboard, password resets, and profile management included.",
    details: ["Full Auth Flow Ready-to-Go.", "Protected User Dashboard."],
  },
  {
    title: "Payload Ready",
    description:
      "Whether you're selling digital downloads (Hoverboard plans) or subscriptions (Timeline Access), the bays are open.",
    details: [
      "Support for One-Time & Recurring billing.",
      "Secure S3/R2 Download Links.",
    ],
  },
  {
    title: "Role-Based Command",
    description:
      "Admin vs. User logic is baked in. Access a private admin panel to view sales stats and user data.",
    details: ["Admin Dashboard Included.", "Role-Gated Routes."],
  },
  {
    title: "Total Control",
    description:
      "No vendor lock-in. You own the code, the database, and the Stripe account. We just gave you the blueprint.",
    details: [
      "100% Open Source (MIT).",
      "Self-Host Anywhere (Vercel, Netlify, Docker).",
    ],
  },
]
