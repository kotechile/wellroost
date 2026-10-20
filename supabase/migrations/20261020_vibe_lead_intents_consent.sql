-- Consent provenance for scenario-report requests.
--
-- vibe_lead_intents already records the address, the asset and the submitted metrics. This adds the
-- one field that makes the row defensible later: WHICH notice the visitor agreed to. Without it, a
-- privacy-page rewrite silently reinterprets every stored email under wording nobody saw.
--
-- Nullable: rows written before this column existed (and any non-email intent) have no notice.
-- `src/lib/leads.ts` sets CONSENT_TEXT_VERSION and must be bumped whenever the on-screen wording in
-- ModelExportForm changes.

alter table public.vibe_lead_intents
	add column if not exists consent_text_version text;

comment on column public.vibe_lead_intents.consent_text_version is
	'Version of the consent notice shown at submission (mirrors CONSENT_TEXT_VERSION in src/lib/leads.ts).';

-- The estate carries two telemetry designs. This front end writes flat events to
-- `vibe_asset_telemetry` (asset_slug + event_type + metadata) and leads to `vibe_lead_intents`
-- (session-based). Consolidating them is a deliberate decision, not an accident to be cleaned up
-- silently: see docs/vibe-telemetry.md.
