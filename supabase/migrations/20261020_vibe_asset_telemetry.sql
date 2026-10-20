-- vibe_asset_telemetry — interaction events from wellroost.com interactive assets.
--
-- Written by the browser with the public anon key, so the table is INSERT-only for `anon`:
-- no select, no update, no delete. Rows are read by the service role (dashboard, n8n, exports),
-- never by the client that wrote them.
--
-- Apply with:  supabase db push        (from a linked project)
--         or:  psql "$DATABASE_URL" -f supabase/migrations/20261020_vibe_asset_telemetry.sql
--
-- Column set mirrors TelemetryPayload in src/lib/telemetry.ts. Keep them in step: a field the app
-- sends that the table lacks is dropped by PostgREST with a 400 the browser only logs.

create table if not exists public.vibe_asset_telemetry (
	id            bigint generated always as identity primary key,
	asset_id      text        not null,
	asset_slug    text        not null,
	event_type    text        not null check (event_type in ('view', 'engage', 'deploy', 'input_change', 'complete')),
	category      text,
	title         text,
	domain        text,
	-- Field NAMES and timings only. Never the visitor's values: these assets take home values,
	-- incomes and project budgets, and storing those turns a calculator into a data-collection
	-- obligation.
	metadata      jsonb       not null default '{}'::jsonb,
	created_at    timestamptz not null default now()
);

comment on table public.vibe_asset_telemetry is
	'Interaction telemetry for wellroost.com interactive assets. INSERT-only for anon.';

-- Read patterns: funnel per asset, and recent activity per day.
create index if not exists vibe_asset_telemetry_asset_created_idx
	on public.vibe_asset_telemetry (asset_slug, created_at desc);

create index if not exists vibe_asset_telemetry_created_idx
	on public.vibe_asset_telemetry (created_at desc);

create index if not exists vibe_asset_telemetry_event_idx
	on public.vibe_asset_telemetry (event_type);

alter table public.vibe_asset_telemetry enable row level security;

-- The browser may append events and nothing else.
drop policy if exists "anon can insert vibe asset telemetry" on public.vibe_asset_telemetry;
create policy "anon can insert vibe asset telemetry"
	on public.vibe_asset_telemetry
	for insert
	to anon
	with check (true);

-- Deliberately no select policy for anon/authenticated: the anon key is public, so a select policy
-- would publish the whole event log. Authenticated dashboard reads should go through the service
-- role or a security-definer view with its own authorisation.
