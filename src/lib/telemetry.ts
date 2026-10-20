/**
 * WellRoost Vibe Marketing Telemetry Pipeline
 * Handles interaction telemetry across wellroost.com interactive micro-assets.
 * Dispatches to Supabase edge / REST endpoint or webhook (e.g. n8n) for intent qualification.
 */

export interface TelemetryPayload {
	assetId?: string;
	assetSlug: string;
	eventType: 'view' | 'engage' | 'deploy' | 'input_change' | 'complete';
	category?: string;
	title?: string;
	metadata?: Record<string, unknown>;
	domain?: string;
}

/**
 * True when at least one sink is configured at BUILD time.
 *
 * Astro inlines `import.meta.env.PUBLIC_*` into the bundle, so these must be present during
 * `astro build` (Docker ARG → ENV). Setting them only on the running container ships a bundle with
 * `undefined` baked in and every event is dropped.
 *
 *   PUBLIC_SUPABASE_URL            https://<project>.supabase.co
 *   PUBLIC_SUPABASE_ANON_KEY       anon/publishable key (browser-safe; RLS enforces writes)
 *   PUBLIC_TELEMETRY_WEBHOOK_URL   optional n8n (or other) webhook
 */
export function isTelemetryConfigured(): boolean {
	const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;
	const webhookUrl = import.meta.env?.PUBLIC_TELEMETRY_WEBHOOK_URL;
	return Boolean((supabaseUrl && supabaseAnonKey) || webhookUrl);
}

let warnedUnconfigured = false;

export async function trackVibeAssetEvent(payload: TelemetryPayload): Promise<void> {
	if (typeof window === 'undefined') return;

	const domain = payload.domain || window.location.hostname || 'wellroost.com';
	const eventBody = {
		asset_id: payload.assetId || payload.assetSlug,
		asset_slug: payload.assetSlug,
		event_type: payload.eventType,
		category: payload.category || 'General',
		title: payload.title || '',
		domain,
		metadata: {
			...payload.metadata,
			pathname: window.location.pathname,
			referrer: document.referrer || null,
			viewport_width: window.innerWidth,
			timestamp: new Date().toISOString()
		}
	};

	// Log in development for validation
	if (import.meta.env?.DEV) {
		console.debug('[WellRoost Telemetry]', eventBody);
	}

	const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;
	const webhookUrl = import.meta.env?.PUBLIC_TELEMETRY_WEBHOOK_URL;

	// No silent no-op. An asset that claims to be instrumented and sends nothing is worse than one
	// that admits it is not — that is how a missing build-time env var goes unnoticed for months.
	// Warn once per page load, then stay quiet.
	if (!(supabaseUrl && supabaseAnonKey) && !webhookUrl) {
		if (!warnedUnconfigured) {
			warnedUnconfigured = true;
			console.warn(
				'[WellRoost Telemetry] no sink configured — set PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY ' +
					'or PUBLIC_TELEMETRY_WEBHOOK_URL at BUILD time. Events are being dropped.'
			);
		}
		return;
	}

	try {
		// 1. Dispatch to Supabase if configured
		if (supabaseUrl && supabaseAnonKey) {
			fetch(`${supabaseUrl}/rest/v1/vibe_asset_telemetry`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					apikey: supabaseAnonKey,
					Authorization: `Bearer ${supabaseAnonKey}`,
					Prefer: 'return=minimal'
				},
				body: JSON.stringify(eventBody),
				keepalive: true
			}).catch((err) => console.warn('[WellRoost Telemetry] Supabase error:', err));
		}

		// 2. Dispatch to n8n webhook if configured
		if (webhookUrl) {
			fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(eventBody),
				keepalive: true
			}).catch((err) => console.warn('[WellRoost Telemetry] Webhook error:', err));
		}
	} catch (e) {
		console.warn('[WellRoost Telemetry] Dispatch failed:', e);
	}
}
