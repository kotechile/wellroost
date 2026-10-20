/**
 * Scenario email capture — the optional conversion on an interactive asset.
 *
 * Design constraints that come from the product side, not from code:
 * - NEVER a gate. The model is usable and exportable without an email; this only offers to send a
 *   copy. A wall in front of the value breaks the premise of an interactive asset.
 * - The email is used for one thing: sending the scenario the visitor just built. The consent line
 *   naming that purpose sits under the submit button, and nothing else is subscribed.
 * - If no sink is configured the form says so. It must not show "Sent" for a request that went
 *   nowhere — the same rule as the telemetry sink.
 *
 * SINK: `vibe_lead_intents`, the estate's existing lead table (session-based, `status` defaults to
 * `pending_n8n_sync` so an n8n branch can pick it up). Deliberately NOT a new `vibe_asset_leads`
 * table: the project already carries two telemetry schemas, and a third table for the same fact
 * would make "did anyone convert" a three-way join.
 */

const VERTICAL = 'wellroost';
const SESSION_KEY = 'wr:sid';

export interface ScenarioLead {
	email: string;
	assetSlug: string;
	assetTitle?: string;
	/** The scenario the visitor asked to have sent: their inputs plus the computed output. */
	scenario: Record<string, unknown>;
}

export type LeadResult =
	| { ok: true }
	| { ok: false; reason: 'not_configured' | 'invalid_email' | 'server' | 'network'; detail?: string };

/** Version of the consent wording on screen. Bump when the notice text changes. */
export const CONSENT_TEXT_VERSION = '2026-10-20';

export function isLeadCaptureConfigured(): boolean {
	return Boolean(import.meta.env?.PUBLIC_SUPABASE_URL && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * A per-tab session id, so a lead can be joined to the interaction events from the same visit.
 * sessionStorage, not localStorage: this is a visit, not a person.
 */
export function telemetrySessionId(): string {
	if (typeof window === 'undefined') return 'server';
	try {
		const existing = window.sessionStorage.getItem(SESSION_KEY);
		if (existing) return existing;
		const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).toString();
		window.sessionStorage.setItem(SESSION_KEY, id);
		return id;
	} catch {
		return 'unavailable';
	}
}

/**
 * Deliberately permissive. Rejecting a plausible address loses a real person; the bounce is the
 * real filter. This only catches obvious typos (the database policy applies the strict check).
 */
export function isValidEmail(email: string): boolean {
	const value = email.trim();
	return value.length >= 5 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function submitScenarioEmail(lead: ScenarioLead): Promise<LeadResult> {
	if (!isValidEmail(lead.email)) return { ok: false, reason: 'invalid_email' };

	const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseAnonKey) return { ok: false, reason: 'not_configured' };

	const body = {
		session_id: telemetrySessionId(),
		asset_slug: lead.assetSlug,
		vertical_slug: VERTICAL,
		email: lead.email.trim().toLowerCase(),
		intent_type: 'model_export',
		consent_text_version: CONSENT_TEXT_VERSION,
		calculated_metrics: {
			asset_title: lead.assetTitle ?? '',
			source_path: typeof window !== 'undefined' ? window.location.pathname : '',
			domain: typeof window !== 'undefined' ? window.location.hostname : 'wellroost.com',
			scenario: lead.scenario
		}
	};

	try {
		const res = await fetch(`${supabaseUrl}/rest/v1/vibe_lead_intents`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: supabaseAnonKey,
				Authorization: `Bearer ${supabaseAnonKey}`,
				Prefer: 'return=minimal'
			},
			body: JSON.stringify(body)
		});
		if (!res.ok) return { ok: false, reason: 'server', detail: `${res.status}` };
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: 'network', detail: String(error) };
	}
}
