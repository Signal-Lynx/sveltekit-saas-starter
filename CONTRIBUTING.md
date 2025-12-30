# Contributing

Night Shift Nation rules: keep it practical, keep it safe, keep it shippable.

Thanks for taking an interest in improving this template. This repo is intended to stay approachable for solo builders, so contributions that reduce complexity are preferred over contributions that add new moving parts.

## What we accept

Good PR ideas:

- Bug fixes and reliability improvements
- Documentation improvements (especially setup, Stripe, Supabase, and deployment notes)
- Security hardening that does not break local dev
- Cleaner patterns for admin flows, audit logging, or entitlement checks
- Tests that cover real user flows

Ideas that usually won't land:

- Big framework swaps
- Heavy opinionated tooling
- Features that require paid vendor services to function

## Development setup (local)

Prereqs:

- Node.js 18+
- Git
- Supabase account
- Stripe account (test mode is fine)

Install:

```bash
npm install
```

Run:

```bash
npm run dev -- --open
```

Checks (the same set CI should run):

```bash
./checks.sh
```

## Database and schema

This repo includes Supabase migrations under `supabase/migrations/`.

Recommended:

```bash
npx supabase login
npx supabase link
npx supabase db push
```

If you change schema:

- add a migration
- ensure any RLS policies still make sense
- update docs if a new env var or setup step is required

## Stripe

When editing billing flows:

- keep Stripe API work server-side only
- document any new webhook event types you rely on
- update `.env.example` if you introduce a new Stripe config value

## Pull requests

1. Keep PRs focused. One idea per PR is ideal.
2. Include:
   - what you changed
   - why you changed it
   - how you tested it (commands + key flows you clicked)
3. If you touch auth, billing, entitlements, admin pages, or access gates, include a short security note in the PR description.

## Reporting issues

Use GitHub Issues. If the issue involves a vulnerability or secrets, do not post it publicly. Follow `SECURITY.md` instead.
