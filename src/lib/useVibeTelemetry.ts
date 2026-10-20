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
 * - `complete` fires once per mount, at COMPLETE_AFTER distinct fields — a proxy for "modelled the
 *   scenario" that works the same way across all three engines without per-engine result plumbing.
 *   An asset with an explicit export/copy action passes `onComplete` for a stronger signal.
 */
import { useEffect, useRef } from 'react';
import { trackVibeAssetEvent } from './telemetry';

const COMPLETE_AFTER = 4;
const DEBOUNCE_MS = 1200;

export interface VibeAssetIdentity {
	slug: string;
	category: string;
	title?: string;
}

export function useVibeTelemetry(asset: VibeAssetIdentity) {
	const changed = useRef<Set<string>>(new Set());
	const completed = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		trackVibeAssetEvent({
			assetSlug: asset.slug,
			category: asset.category,
			title: asset.title,
			eventType: 'view'
		});
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
		// Identity is static per asset; keying on the slug avoids re-firing on re-render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [asset.slug]);

	const flush = () => {
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

		if (!completed.current && changed.current.size >= COMPLETE_AFTER) {
			completed.current = true;
			trackVibeAssetEvent({
				assetSlug: asset.slug,
				category: asset.category,
				title: asset.title,
				eventType: 'complete',
				metadata: { fields_changed: changed.current.size, trigger: 'field_threshold' }
			});
		}
	};

	/** Call from an explicit export/copy/print action — the strongest completion signal. */
	const onComplete = (metadata: Record<string, unknown> = {}) => {
		if (completed.current) return;
		completed.current = true;
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
