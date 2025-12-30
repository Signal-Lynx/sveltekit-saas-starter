# Security Policy

This template is intended to be deployed to production. Security is not optional.

## Supported versions

We generally support the latest main branch. If you are using an older commit, update first.

## Reporting a vulnerability

Please report any vulnerabilities via this repository's Security tab:
https://github.com/Signal-Lynx/sveltekit-saas-starter/security

That channel lets us privately track, fix, and publish the fix before public disclosure.

Please do not publicly disclose potential vulnerabilities until we have had a reasonable opportunity to investigate and address them.

If you cannot use GitHub’s Security tab for some reason, you may email:
contact@signallynx.com

Suggested subject:
Security report: sveltekit-saas-starter

Include:

1. A clear description of the issue
2. Steps to reproduce
3. Impact (what an attacker could do)
4. Any proof-of-concept details you have
5. Whether you think it is actively exploitable

## What we will do

- Acknowledge your report
- Validate the issue
- Patch and ship a fix as quickly as practical
- Credit you if you want (optional)

## Hardening notes (recommended baseline)

This repo includes patterns for:

- Access gates (controlled launches)
- Admin route protection
- Rate limiting of sensitive endpoints
- Turnstile support for abuse-prone forms
- Entitlement gating for downloads and dashboards

Operational note:
Cloudflare or Vercel basic bot features can break legitimate server-to-server calls in some architectures. Use WAF rules, rate limits, and Turnstile first. If you upgrade plans later, use allowlists and advanced bot controls.

## Secrets and keys

Never commit:

- Supabase service role keys
- Stripe secret keys
- Webhook signing secrets
- Key Commander API keys
- Any private R2 credentials

Use:

- `.env` locally
- platform secrets in your host (Vercel, Cloudflare, or equivalent)
