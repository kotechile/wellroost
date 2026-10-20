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

		if (href) {
			setTimeout(() => {
				window.location.href = href;
			}, 250);
		}
	};

	return (
		<div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all shadow-xl flex flex-col justify-between">
			<div>
				<div className="flex items-center justify-between mb-3">
					<span className="text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/50">
						{category}
					</span>
					<span className="text-xs font-mono text-zinc-500">Interactive Asset v1.0</span>
				</div>
				<h3 className="text-xl font-semibold text-zinc-100 mb-2">{title}</h3>
				<p className="text-sm text-zinc-400 mb-4 leading-relaxed">{description}</p>
				{metricsPreview && (
					<div className="mb-6 rounded-md bg-zinc-950/60 p-3 border border-zinc-800/80">
						<span className="text-xs font-mono text-zinc-400 block">{metricsPreview}</span>
					</div>
				)}
			</div>
			<button
				type="button"
				onClick={handleAction}
				className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm cursor-pointer"
			>
				<span>{engaged ? 'Opening engine…' : 'Open Full Multivariable Engine →'}</span>
			</button>
		</div>
	);
};

export default VibeAssetCard;
