-- ==============================================================================
-- WellRoost Vibe Marketing Telemetry Schema (wellroost.com)
-- Captures micro-asset interaction telemetry, session state, and intent qualification
-- without requiring upfront email capture.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vibe_asset_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id TEXT NOT NULL,
    asset_slug TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'engage', 'deploy', 'input_change', 'complete', 'lead_convert')),
    category TEXT NOT NULL DEFAULT 'General',
    title TEXT,
    domain TEXT NOT NULL DEFAULT 'wellroost.com',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for telemetry querying, funnels, and real-time aggregation
CREATE INDEX IF NOT EXISTS idx_vibe_telemetry_slug ON public.vibe_asset_telemetry(asset_slug);
CREATE INDEX IF NOT EXISTS idx_vibe_telemetry_event ON public.vibe_asset_telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_vibe_telemetry_domain ON public.vibe_asset_telemetry(domain);
CREATE INDEX IF NOT EXISTS idx_vibe_telemetry_created_at ON public.vibe_asset_telemetry(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vibe_asset_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow anonymous visitors on wellroost.com to write telemetry events
CREATE POLICY "Allow public anonymous telemetry insert"
    ON public.vibe_asset_telemetry
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Restrict read access to internal authenticated users & service role (e.g. n8n pipelines)
CREATE POLICY "Allow service role read access"
    ON public.vibe_asset_telemetry
    FOR SELECT
    TO service_role
    USING (true);

-- Optional Database Webhook notification to trigger n8n workflows
-- When an 'engage' or 'complete' event is logged, Supabase triggers an HTTP POST to n8n
COMMENT ON TABLE public.vibe_asset_telemetry IS 'Telemetry log for WellRoost interactive micro-applications and decision engines.';
