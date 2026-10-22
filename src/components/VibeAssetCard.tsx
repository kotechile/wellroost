import React, { useEffect, useState } from 'react';
import { trackVibeAssetEvent } from '../lib/telemetry';

export interface VibeAssetProps {
	title: string;
	category: string;
	description: string;
	onDeploy?: () => void;
	slug?: string;
	href?: string;
	metricsPreview?: string;
}

/**
 * The card that advertises an engine on `/calculators/`.
 *
 * Emits `view` when it becomes visible and `engage` when it is opened, both under the asset's
 * canonical slug (pass `slug` from `src/lib/vibeAssets.ts` — never a local literal, or the click
 * cannot be joined to the engine `view` it produced).
 *
 * The CTA is an `<a>`, not a `<button>` that assigns `window.location` after a timeout: it is a
 * navigation, so it must support middle-click, ⌘-click, "open in new tab" and a visible URL — and it
 * must not wait 250 ms to happen.
 */
export const VibeAssetCard: React.FC<VibeAssetProps> = ({
	title,
	category,
	description,
	onDeploy,
	slug,
	href,
	metricsPreview
}) => {
	const [engaged, setEngaged] = useState(false);
	const assetSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

	// The card renders with `client:visible`, so this is an "actually seen" signal rather than a
	// page-view copy. Without it a zero-click card and a card nobody scrolled to are identical in
	// the data — and the click is the only thing this surface exists to produce.
	useEffect(() => {
		trackVibeAssetEvent({
			assetSlug,
			category,
			title,
			eventType: 'view',
			metadata: { href, metricsPreview }
		});
		// assetSlug/category/title are static per asset.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [assetSlug]);

	const handleAction = () => {
		setEngaged(true);

		// Dispatch telemetry for user engagement
		trackVibeAssetEvent({
			assetSlug,
			category,
			title,
			eventType: 'engage',
			metadata: { metricsPreview, href }
		});

		if (onDeploy) {
			onDeploy();
		}
	};

	// White panel + `#1d6ae5` action, matching design-language.md and the neighbouring cards. This was
	// `zinc-900` glassmorphism: the only dark surface on an otherwise white editorial page, and a
	// style the design language does not define.
	const ctaClass =
		'flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
	const label = <span>{engaged ? 'Opening engine…' : 'Open Full Multivariable Engine →'}</span>;

	return (
		<article className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
			<div>
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] font-semibold text-blue-700">
						{category}
					</span>
					<span className="font-mono text-[0.62rem] text-gray-400">Interactive Asset v1.0</span>
				</div>
				<h3 className="text-xl font-bold tracking-tight text-gray-1000">{title}</h3>
				<p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
				{metricsPreview && (
					<div className="my-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
						<span className="block font-mono text-[0.7rem] leading-5 text-gray-800">{metricsPreview}</span>
					</div>
				)}
			</div>
			{href ? (
				<a href={href} onClick={handleAction} className={ctaClass} data-asset-slug={assetSlug}>
					{label}
				</a>
			) : (
				<button type="button" onClick={handleAction} className={ctaClass} data-asset-slug={assetSlug}>
					{label}
				</button>
			)}
		</article>
	);
};

export default VibeAssetCard;
