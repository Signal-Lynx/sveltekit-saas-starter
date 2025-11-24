// FILE: src/lib/data/faqData.ts

export interface FaqItem {
  question: string
  answer: string
}

// ======================================================================
// GENERAL DOSSIER - Real help for the Template User
// ======================================================================
export const generalFaqs: FaqItem[] = [
  {
    question: "Okay, serious question: How do I use this template?",
    answer:
      "<p>This entire site is your playground. Clone the repo, check the <code>CUSTOMIZATION.md</code> file, and start replacing our sci-fi jokes with your own product details. The backend (Auth, Stripe, Supabase) is already wired up and ready to go.</p>",
  },
  {
    question: "I broke something. Who do I call?",
    answer:
      "<p>If you broke the timeline, that's on you. If you broke the code or have questions about <strong>Key Commander</strong>, reach out to the real humans at <a href='https://signallynx.com' target='_blank' class='link link-primary'>Signal Lynx</a>. We're on Telegram and X, and we actually reply.</p>",
  },
  {
    question: "Do I need Key Commander to run this?",
    answer:
      "<p>Technically, no. You can rip out the license checks and just use this as a killer SvelteKit + Supabase + Stripe starter. But <strong>Key Commander</strong> makes the licensing/entitlements part trivial, so we highly recommend it for saving time.</p>",
  },
  {
    question: "Where do I change the colors?",
    answer:
      "<p>Check <code>src/lib/theme.ts</code>. We use DaisyUI, so you can swap the hex codes for 'primary', 'secondary', and 'accent' to instantly rebrand the entire site.</p>",
  },
]

// ======================================================================
// HOVER TECH - In-Universe Fun
// ======================================================================
export const hoverFaqs: FaqItem[] = [
  {
    question: "Is the Hoverboard real?",
    answer:
      "<p>Define 'real'. Is it a physical object you can touch? No. Is it a digital file that costs money? Yes. In many ways, that makes it more real than your hopes and dreams. Next question.</p>",
  },
  {
    question: "Does the Anti-Gravity Society membership include dental?",
    answer:
      "<p>No. But it does include free firmware updates that may or may not stabilize the magnetic field around your feet. We consider that a fair trade.</p>",
  },
]

// ======================================================================
// TIMELINE C - In-Universe Fun
// ======================================================================
export const timelineFaqs: FaqItem[] = [
  {
    question: "If I cancel my subscription, where do I go?",
    answer:
      "<p>You get dumped back into the prime timeline. Yes, the one with the traffic jams, the bugs in production, and the expensive coffee. We recommend auto-renew.</p>",
  },
  {
    question: "Is Timeline C safe?",
    answer:
      "<p>It's safer than Timeline A, but that's a low bar. We've patched most of the existential dread, but you might still experience mild déjà vu on Tuesdays.</p>",
  },
]

// Legacy exports for compatibility if needed by other files
export const universalFaqs = generalFaqs
export const signalShieldFaqs = hoverFaqs
export const lynxRelayFaqs = hoverFaqs
export const keyCommanderFaqs = timelineFaqs
