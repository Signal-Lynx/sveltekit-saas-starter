-- ============================================================
-- Base schema (lint-clean for Supabase) — REGENERATED / HARDENED
-- - Preserves object names, columns, types, triggers, views, policies
-- - Adds consistency, idempotency, and safe guards
-- ============================================================

-- =========================
-- Extensions
-- =========================
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- =========================
-- Tables
-- =========================

-- public.profiles
create table if not exists public.profiles (
  id                    uuid primary key,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  full_name             text,
  company_name          text,
  avatar_url            text,
  website               text,
  unsubscribed          boolean not null default false,
  is_beta_tester        boolean not null default false,
  last_email_change_at  timestamptz,
  is_admin              boolean not null default false,
  email                 text
);

-- FK: profiles.id -> auth.users(id) (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id)
      on update no action
      on delete cascade;
  end if;
end$$;

-- public.stripe_customers
create table if not exists public.stripe_customers (
  user_id            uuid primary key,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  stripe_customer_id text not null
);

-- FK: stripe_customers.user_id -> auth.users(id) (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stripe_customers_user_id_fkey'
  ) then
    alter table public.stripe_customers
      add constraint stripe_customers_user_id_fkey
      foreign key (user_id) references auth.users(id)
      on update no action
      on delete cascade;
  end if;
end$$;

-- Unique index on stripe_customer_id
create unique index if not exists stripe_customers_stripe_customer_id_key
  on public.stripe_customers (stripe_customer_id);

-- public.contact_requests
create table if not exists public.contact_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  company_name  text,
  message_body  text
);

-- public.admin_audit
create table if not exists public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor       uuid not null,
  action      text not null,
  target      uuid,
  meta        jsonb not null default '{}'::jsonb
);

-- public.admin_mrr_daily
create table if not exists public.admin_mrr_daily (
  day                     date primary key,
  mrr_cents               bigint not null,
  arr_cents               bigint not null,
  active_subscriptions    integer not null default 0,
  new_subscriptions       integer not null default 0,
  churned_subscriptions   integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- public.stripe_webhook_events (audit + idempotency fence)
create table if not exists public.stripe_webhook_events (
  id           text primary key,                 -- Stripe event id
  type         text not null,                    -- e.g., 'checkout.session.completed'
  raw_body     text,                             -- request body for forensics/replay
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  status       text,                             -- 'ok' | 'error'
  error        text
);

-- OPTIONAL: small override surface for product cards (UI copy / visibility)
create table if not exists public.product_overrides (
  id            text primary key,                -- matches your Product.id in code
  price_display text,                            -- override for UI price text
  hidden        boolean,                         -- override to hide/show a card
  cta_label     text,                            -- optional override for button label
  footnote      text,                            -- optional extra UI copy
  updated_at    timestamptz not null default now()
);

-- =========================
-- Indexes (non-PK)
-- =========================

-- Admin audit indexes
create index if not exists admin_audit_actor_idx on public.admin_audit (actor);
create index if not exists admin_audit_target_idx on public.admin_audit (target);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public'
      and tablename='admin_audit'
      and indexname='admin_audit_created_at_idx'
  ) then
    execute 'create index admin_audit_created_at_idx on public.admin_audit (created_at desc)';
  end if;
end$$;

-- Helpful email lookup (equality)
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Fast substring/ILIKE searches on email (functional)
create index if not exists profiles_email_trgm_idx
  on public.profiles
  using gin (lower(email) gin_trgm_ops);

-- ALSO support planner for raw ILIKE on email (no lower())
create index if not exists profiles_email_trgm_idx_raw
  on public.profiles
  using gin (email gin_trgm_ops);

-- Webhook dashboards/queries
create index if not exists idx_stripe_webhook_events_received_at
  on public.stripe_webhook_events (received_at desc);

create index if not exists idx_stripe_webhook_events_type
  on public.stripe_webhook_events (type);

-- Fast path for error-focused views
create index if not exists stripe_webhook_events_error_idx
  on public.stripe_webhook_events (received_at desc)
  where status = 'error';

-- =========================
-- Functions  (search_path pinned per linter)
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
volatile
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
begin
  if (new.email is distinct from old.email) then
    update public.profiles
       set email = new.email,
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$function$;

-- Prune old webhook audit rows; default = 60 days
create or replace function public.prune_stripe_webhook_events(retention_days integer default 60)
returns integer
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $fn$
declare
  deleted_count integer := 0;
begin
  delete from public.stripe_webhook_events
   where received_at < (now() - make_interval(days => retention_days));

  get diagnostics deleted_count = row_count;
  return coalesce(deleted_count, 0);
end;
$fn$;

-- Lock down execution to the service role (server-side only)
revoke all on function public.prune_stripe_webhook_events(integer) from public;
grant execute on function public.prune_stripe_webhook_events(integer) to service_role;

-- =========================
-- Triggers (public.*)
-- =========================
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists stripe_customers_set_updated_at on public.stripe_customers;
create trigger stripe_customers_set_updated_at
before update on public.stripe_customers
for each row execute function public.set_updated_at();

drop trigger if exists contact_requests_set_updated_at on public.contact_requests;
create trigger contact_requests_set_updated_at
before update on public.contact_requests
for each row execute function public.set_updated_at();

drop trigger if exists admin_mrr_daily_set_updated_at on public.admin_mrr_daily;
create trigger admin_mrr_daily_set_updated_at
before update on public.admin_mrr_daily
for each row execute function public.set_updated_at();

drop trigger if exists product_overrides_set_updated_at on public.product_overrides;
create trigger product_overrides_set_updated_at
before update on public.product_overrides
for each row execute function public.set_updated_at();

-- =========================
-- View(s)
-- =========================

drop view if exists public.admin_audit_view;
create view public.admin_audit_view as
select a.id,
       a.created_at,
       a.actor,
       pa.email as actor_email,
       a.action,
       a.target,
       pt.email as target_email,
       a.meta
  from public.admin_audit a
  left join public.profiles pa on pa.id = a.actor
  left join public.profiles pt on pt.id = a.target;

alter view public.admin_audit_view set (security_invoker = on);

-- Unified profile read (inherently secure for client-side access)
drop view if exists public.user_profiles_view;
create or replace view public.user_profiles_view as
select
  u.id,
  u.email,
  p.full_name,
  p.company_name,
  p.website,
  p.avatar_url,
  p.unsubscribed,
  p.is_beta_tester,
  p.is_admin,
  p.created_at,
  p.updated_at
from auth.users u
join public.profiles p on p.id = u.id
where u.id = auth.uid(); -- THIS LINE MAKES THE VIEW SECURE

alter view public.user_profiles_view set (security_invoker = on);

-- =========================
-- Triggers on auth.users
-- =========================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- =========================
-- Row Level Security (RLS)
-- =========================
alter table public.profiles                 enable row level security;
alter table public.stripe_customers         enable row level security;
alter table public.contact_requests         enable row level security;
alter table public.admin_audit              enable row level security;
alter table public.admin_mrr_daily          enable row level security;
alter table public.stripe_webhook_events    enable row level security;
alter table public.product_overrides        enable row level security;

-- =========================
-- RLS Policies
-- =========================

-- PROFILES TABLE
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using ((select auth.uid()) = id);

-- STRIPE_CUSTOMERS TABLE
drop policy if exists "Users can read their own stripe_customer record" on public.stripe_customers;
create policy "Users can read their own stripe_customer record"
on public.stripe_customers for select
using ((select auth.uid()) = user_id);

-- SERVER-SIDE ONLY TABLES (explicitly scoped to service_role)
drop policy if exists "service role only" on public.stripe_webhook_events;
create policy "service role only" on public.stripe_webhook_events for all to service_role using (true) with check (true);

drop policy if exists "service role only" on public.admin_audit;
create policy "service role only" on public.admin_audit for all to service_role using (true) with check (true);

drop policy if exists "service role only" on public.admin_mrr_daily;
create policy "service role only" on public.admin_mrr_daily for all to service_role using (true) with check (true);

drop policy if exists "service role only" on public.contact_requests;
create policy "service role only" on public.contact_requests for all to service_role using (true) with check (true);

drop policy if exists "service role only" on public.product_overrides;
create policy "service role only" on public.product_overrides for all to service_role using (true) with check (true);

-- CONTACT FORM
-- Insert is performed server-side using the service_role key (keeps CAPTCHA + validation in your app layer).
-- Do NOT allow direct anon inserts to the table (prevents bypassing app-layer protections).
drop policy if exists "anon can submit contact form" on public.contact_requests;

-- =========================
-- Scheduled maintenance (pg_cron)
-- =========================
do $outer$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'cron' and table_name = 'job' and column_name = 'jobname'
    ) then
      perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'prune_webhooks_daily';

      perform cron.schedule(
        'prune_webhooks_daily',
        '0 3 * * *',
        'select public.prune_stripe_webhook_events(60);'
      );
    else
      perform cron.unschedule(jobid)
      from cron.job
      where command = 'select public.prune_stripe_webhook_events(60);';

      perform cron.schedule(
        '0 3 * * *',
        'select public.prune_stripe_webhook_events(60);'
      );
    end if;
  end if;
end
$outer$;


-- =========================
-- Minimum Required Privileges (self-contained after a wipe)
-- =========================
-- Goal: one-and-done apply; no post-steps in Studio required.

-- 1) Harden the schema surface: remove CREATE from PUBLIC (keep USAGE).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2) Table-level base privileges so RLS can run (principle of least privilege).
-- Profiles: clients can ONLY read their own row (subject to RLS).
-- Updates are handled exclusively via server-side actions (supabaseAdmin).
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Stripe customers: clients read their own mapping (no writes).
GRANT SELECT ON TABLE public.stripe_customers TO authenticated;

-- Contact form: server-side only (service_role). No direct client inserts.
REVOKE INSERT ON TABLE public.contact_requests FROM anon, authenticated;

-- (Intentionally NO grant on admin tables, product_overrides, webhook audit to anon/authenticated)

-- The user_profiles_view is also intentionally not granted to client-side roles.
-- This application fetches profile data on the server using the service_role key
-- and passes it to the client, which is a more secure pattern.
-- If you were to query this view from the client, you would add:
-- GRANT SELECT ON TABLE public.user_profiles_view TO authenticated;

-- Service role (server): full access to operate.
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3) Defaults for FUTURE objects created by this migration role (usually 'postgres').
-- Keep client defaults conservative; service_role gets everything.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;