-- vibe_asset_leads — optional "email me this scenario" requests from wellroost.com assets.
--
-- Distinct from vibe_asset_telemetry on purpose:
--   * telemetry is anonymous and records field NAMES only;
--   * a lead is an identified person who asked for something to be sent, so it carries their email
--     and the scenario they submitted. Mixing the two in one table would make every anonymous event
--     queryable next to a personal identifier, and complicate deletion.
--
-- Consent is recorded with the notice version that was on screen (`consent_text_version`), so a row
-- always answers to the wording it was given under. Applying a new privacy notice means a new
-- version string in src/lib/leads.ts, not a silent edit.
--
-- Apply with:  supabase db push
--         or:  psql "$DATABASE_URL" -f supabase/migrations/20261020_vibe_asset_leads.sql

create table if not exists public.vibe_asset_leads (
	id                   bigint generated always as identity primary key,
	email                text        not null check (position('@' in email) > 1),
	asset_slug           text        not null,
	asset_title          text,
	-- The model the visitor asked to have sent: their inputs plus the computed output.
	scenario             jsonb       not null default '{}'::jsonb,
	consent_text_version text        not null,
	source_path          text,
	domain               text,
	-- Delivery state, so a failure to send is visible instead of silent.
	delivery_status      text        not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
	delivered_at         timestamptz,
	created_at           timestamptz not null default now(),
	-- One report per address per asset: a repeat submit is a success for the visitor, and the upsert
	-- below turns it into an update instead of a duplicate row.
	unique (email, asset_slug)
);

comment on table public.vibe_asset_leads is
	'Scenario report requests from interactive assets. INSERT/UPDATE only for anon; delivery is marked by the service role.';

create index if not exists vibe_asset_leads_created_idx on public.vibe_asset_leads (created_at desc);
create index if not exists vibe_asset_leads_asset_idx on public.vibe_asset_leads (asset_slug);
create index if not exists vibe_asset_leads_pending_idx on public.vibe_asset_leads (delivery_status) where delivery_status = 'pending';

alter table public.vibe_asset_leads enable row level security;

-- The browser may create a lead and update the scenario it submitted (a returning visitor changing
-- their inputs and asking again). It may not read rows, change the email, or mark anything as sent —
-- delivery state belongs to the mail job, which runs with the service role and bypasses RLS.
drop policy if exists "anon can request a scenario report" on public.vibe_asset_leads;
create policy "anon can request a scenario report"
	on public.vibe_asset_leads
	for insert
	to anon
	with check (delivery_status = 'pending' and delivered_at is null);

drop policy if exists "anon can resubmit the same scenario" on public.vibe_asset_leads;
create policy "anon can resubmit the same scenario"
	on public.vibe_asset_leads
	for update
	to anon
	using (true)
	with check (delivery_status = 'pending' and delivered_at is null);

-- No select policy: the anon key is public. Reads and exports go through the service role or an
-- authenticated dashboard.

-- Optional: a queue view the mail worker can poll.
create or replace view public.vibe_asset_leads_pending as
	select id, email, asset_slug, asset_title, scenario, consent_text_version, created_at
	from public.vibe_asset_leads
	where delivery_status = 'pending'
	order by created_at;
