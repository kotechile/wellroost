/**
 * Instrumentation hook for an interactive asset.
 *
 * The principle behind "vibe marketing" only holds if the asset reports what a visitor actually
 * did with it. A click on a card is a weak signal; the useful one is *which* inputs a visitor moved
 * and when they finished modelling — that is what separates a real intent from a bounce.
 *
 * Deliberate limits:
 * - Only FIELD NAMES are sent, never values. The inputs here are home values, incomes and project
 *   budgets; shipping those to an analytics table turns a calculator into a data-collection
 *   liability and needs far more consent machinery than this needs.
 * - `view` fires once per mount (the card/page renders with `client:visible`, so this is an
 *   "actually seen" signal, not a page-view copy).
 * - `complete` fires at most twice per mount, and the two are different facts:
 *   `complete{trigger:'field_threshold'}` once at COMPLETE_AFTER distinct fields (a proxy for
 *   "modelled the scenario" that works the same way across all engines without per-engine result
 *   plumbing), and `complete{trigger:'export'}` from an explicit export/copy/print action, which is
 *   the real conversion. Each row carries a session id, so a funnel counts sessions per stage rather
 *   than adding rows and calling the threshold a conversion.
 */
import { useEffect, useRef } from 'react';
import { trackVibeAssetEvent, trafficEntry } from './telemetry';

const COMPLETE_AFTER = 4;
const DEBOUNCE_MS = 1200;

export interface VibeAssetIdentity {
	slug: string;
	category: string;
	title?: string;
}

export function useVibeTelemetry(asset: VibeAssetIdentity) {
	const changed = useRef<Set<string>>(new Set());
	// Two independent refs, because these are two different facts. `complete{trigger:'field_threshold'}`
	// is a PROXY — the visitor modelled something. `complete{trigger:'export'}` is the real thing.
	// A single shared flag dropped the second one: in a ten-field engine the threshold always fires
	// first, so the export that actually converted the visitor was never recorded.
	const thresholdFired = useRef(false);
	const exportFired = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		trackVibeAssetEvent({
			assetSlug: asset.slug,
			category: asset.category,
			title: asset.title,
			eventType: 'view',
			// Where the visit came from, so a cited scenario link is separable from search traffic.
			metadata: { entry: trafficEntry() }
		});
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
		// Identity is static per asset; keying on the slug avoids re-firing on re-render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [asset.slug]);

	const flush = () => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		trackVibeAssetEvent({
			assetSlug: asset.slug,
			category: asset.category,
			title: asset.title,
			eventType: 'input_change',
			metadata: {
				fields_changed: changed.current.size,
				fields: [...changed.current]
			}
		});
	};

	/** Call from the asset's single input-update path, with the field name only. */
	const onInputChange = (field: string) => {
		changed.current.add(field);

		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(flush, DEBOUNCE_MS);

		if (!thresholdFired.current && changed.current.size >= COMPLETE_AFTER) {
			thresholdFired.current = true;
			// Flush the pending debounce first, or the funnel reads `complete` before the
			// `input_change` that caused it and "last event per session" answers the wrong question.
			flush();
			trackVibeAssetEvent({
				assetSlug: asset.slug,
				category: asset.category,
				title: asset.title,
				eventType: 'complete',
				metadata: { fields_changed: changed.current.size, trigger: 'field_threshold' }
			});
		}
	};

	/**
	 * Call from an explicit export/copy/print action — the strongest completion signal.
	 *
	 * Fires even when the field threshold already reported completion: they are separate rows on
	 * purpose, and every one of them carries the session id, so the funnel counts
	 * `count(distinct session_id)` per stage instead of adding up rows.
	 */
	const onComplete = (metadata: Record<string, unknown> = {}) => {
		if (exportFired.current) return;
		exportFired.current = true;
		trackVibeAssetEvent({
			assetSlug: asset.slug,
			category: asset.category,
			title: asset.title,
			eventType: 'complete',
			metadata: { ...metadata, fields_changed: changed.current.size, trigger: 'export' }
		});
	};

	return { onInputChange, onComplete };
}
