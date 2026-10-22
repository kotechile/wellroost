-- Give vibe_lead_intents the same topic column its aichieve twin already had.
--
-- BEFORE: vibe_lead_intents      = id, session_id, asset_slug, vertical_slug, email, intent_type,
--                                  calculated_metrics, status, created_at, consent_text_version, delivered_at
--         aichieve_lead_intents  = the same PLUS domain_category
--
-- `vertical_slug` says which property owns the lead. `domain_category` says what the asset is about
-- ('EQUITY ARV', 'CAPEX UNDERWRITING', 'agentic-ai'). Aichieve stored both; the vibe tables stored
-- only the first, so a cross-property query could group leads by property but not by topic.
--
-- Nullable, and deliberately not backfilled with a guess: the three rows that existed were probes
-- with no packet category to recover. NULL means "captured before this was recorded", the same
-- convention as consent_text_version. Writers now send it (src/lib/leads.ts falls back to the packet's
-- own `category`; the giniloh client passes the card's category), so new rows always arrive filled.

alter table public.vibe_lead_intents add column if not exists domain_category text;

comment on column public.vibe_lead_intents.domain_category is
	'Topic taxonomy of the asset (EQUITY ARV, CAPEX UNDERWRITING). Mirrors aichieve_lead_intents.domain_category; vertical_slug says who owns the lead, this says what it is about. NULL = captured before the field existed.';
