/**
 * The canonical identity of every interactive acquisition asset.
 *
 * `slug` is the ONE join key across the surface that advertises an asset (a `VibeAssetCard` on
 * `/calculators/`), the engine page that hosts it, and any article CTA that links to it. It is what
 * `vibe_asset_telemetry.asset_slug` stores, so the funnel query
 * (view → input_change → complete, grouped by asset_slug) only works if all three emit the same
 * string.
 *
 * They did not. The hub cards emitted `equity-arv-recovery-engine` / `relocation-friction-ledger`
 * while the engines emitted `remodeling-roi` / `move-or-improve`, so a card `engage` had no matching
 * engine `view` and the funnel had a top with no middle — the exact failure a funnel exists to catch,
 * hidden inside the funnel itself. Declaring the asset once, here, makes that drift impossible rather
 * than merely fixed: there is no second literal to forget.
 *
 * Do not inline these strings anywhere else. Import `vibeAssets`.
 */
export interface VibeAsset {
	/** Telemetry key. Stable across renames of the title or the URL — changing it breaks history. */
	slug: string;
	/** Topic taxonomy, stored in `category` on events and `domain_category` on leads. */
	category: string;
	title: string;
	description: string;
	/** The formula the card shows. Sells the engine's substance before the click. */
	metricsPreview: string;
	/** Engine path. A page path, deliberately NOT the slug: renaming a URL must not split the data. */
	href: string;
}

export const vibeAssets = {
	/** Quick remodel decision engine — `/calculators/remodeling-roi/`. */
	equityArv: {
		slug: 'equity-arv-recovery-engine',
		category: 'EQUITY ARV',
		title: 'Equity ARV Recovery Engine',
		description:
			'Underwrite $20k–$150k remodeling projects against hyper-local comp appreciation before signing contractor agreements.',
		metricsPreview: 'Comp ARV = Base Appraised Value + (CapEx × Recovery Rate) - Carry Depreciation',
		href: '/calculators/remodeling-roi/'
	},
	/** Multivariable 5-year ledger — `/calculators/move-or-improve/`. */
	relocationFriction: {
		slug: 'relocation-friction-ledger',
		category: 'MOVE VS IMPROVE',
		title: '5-Year Relocation Friction Ledger',
		description:
			'Compare 8-10% selling commissions, transfer taxes, and interest rate step-ups against expanding your current footprint.',
		metricsPreview: 'Relocation Friction Delta = Net Sale Carry - In-Place Renovation ROI',
		href: '/calculators/move-or-improve/'
	},
	/** Full underwriting platform — `/calculators/remodelytics/`. */
	remodelytics: {
		slug: 'remodelytics-underwriter',
		category: 'CAPEX UNDERWRITING',
		title: 'Remodelytics Multi-Engine Underwriter',
		description:
			'Pressure-test ADU rental yields, combined LTV ceilings, and contractor over-improvement risk in a single dashboard.',
		metricsPreview: 'MAO Underwriting = (Comp ARV × 70%) - Total CapEx - Financing Friction',
		href: '/calculators/remodelytics/'
	}
} as const satisfies Record<string, VibeAsset>;

/** Every asset, in hub display order. */
export const vibeAssetList: VibeAsset[] = [vibeAssets.equityArv, vibeAssets.relocationFriction, vibeAssets.remodelytics];

export type VibeAssetSlug = (typeof vibeAssets)[keyof typeof vibeAssets]['slug'];
