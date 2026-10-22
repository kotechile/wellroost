-- Session id on interaction events: the column that makes the funnel a funnel.
--
-- BEFORE: vibe_asset_telemetry = id, asset_id, asset_slug, event_type, category, title, domain,
--                               metadata, created_at
--
-- Every funnel this estate actually wants to read is a per-visitor question — "how many people
-- reached the engine and then finished it" — but a row count cannot answer it. A reload doubles
-- `view`; an asset that legitimately emits `complete{trigger:'field_threshold'}` and then the real
-- `complete{trigger:'export'}` counted as two conversions. With `session_id` the same query becomes
-- `count(distinct session_id) filter (where event_type = …)`.
--
-- It also lets a lead be joined to the events of the visit that produced it: `src/lib/leads.ts`
-- already writes `vibe_lead_intents.session_id`, and `src/lib/telemetry.ts` now writes the same id
-- on every event (one implementation, `telemetrySessionId()`).
--
-- Nullable on purpose. Rows written before this existed have no recoverable session; NULL means
-- "predates the column", the same convention as vibe_lead_intents.consent_text_version. The
-- documented funnel falls back to the row id for those, so legacy rows count as their own session
-- instead of collapsing into one bogus visitor.
--
-- Aligns with the sibling tables in this project, which already carry session_id:
-- vibe_telemetry_events, aichieve_telemetry_events, vibe_asset_sessions.
--
-- Apply with:  supabase db push
--         or:  psql "$DATABASE_URL" -f supabase/migrations/20261023_vibe_asset_telemetry_session.sql
--
-- DEPLOY ORDER MATTERS: ship this BEFORE the front-end build that sends `session_id`. PostgREST
-- rejects an INSERT naming a column the table lacks with a 400 that only the browser console sees —
-- which would look exactly like "telemetry is broken again".

alter table public.vibe_asset_telemetry
	add column if not exists session_id text;

comment on column public.vibe_asset_telemetry.session_id is
	'Random per-tab id (sessionStorage, no identity behind it). Same id on the lead row from the same visit. NULL = recorded before the column existed; count it as its own session.';

-- Read pattern: one asset's funnel within a window, grouped by session.
create index if not exists vibe_asset_telemetry_session_idx
	on public.vibe_asset_telemetry (session_id, created_at desc);
