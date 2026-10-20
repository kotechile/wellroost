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
 */

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

export function isLeadCaptureConfigured(): boolean {
	return Boolean(import.meta.env?.PUBLIC_SUPABASE_URL && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Deliberately permissive. Rejecting a plausible address loses a real person; the server-side check
 * and the bounce are the real filters. This only catches obvious typos.
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
		email: lead.email.trim().toLowerCase(),
		asset_slug: lead.assetSlug,
		asset_title: lead.assetTitle ?? '',
		scenario: lead.scenario,
		consent_text_version: '2026-10-20',
		source_path: typeof window !== 'undefined' ? window.location.pathname : '',
		domain: typeof window !== 'undefined' ? window.location.hostname : 'wellroost.com'
	};

	try {
		const res = await fetch(`${supabaseUrl}/rest/v1/vibe_asset_leads`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: supabaseAnonKey,
				Authorization: `Bearer ${supabaseAnonKey}`,
				Prefer: 'return=minimal'
			},
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			// 409 = the same email already asked for this asset's report; that is a success from the
			// visitor's point of view (they will get the mail), so do not surface it as an error.
			if (res.status === 409) return { ok: true };
			return { ok: false, reason: 'server', detail: `${res.status}` };
		}
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: 'network', detail: String(error) };
	}
}
