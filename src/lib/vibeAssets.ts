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
	/**
	 * The homepage quote check — a three-input cut of the ROI engine.
	 *
	 * It reports under its own slug rather than borrowing the engine's: the hero is visited by an
	 * order of magnitude more people than the engine page, and merging the two would make the
	 * engine's view→complete funnel look like a 2% conversion when it is the hero doing the viewing.
	 */
	quoteCheck: {
		slug: 'hero-quote-check',
		category: 'CAPEX UNDERWRITING',
		title: 'Quote Check',
		description:
			'Three inputs — project cost, resale lift, annual savings — return the gap you carry and how long savings take to close it.',
		metricsPreview: 'Gap = Project Cost - Resale Lift',
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
	},
	/**
	 * Wave 1 — defense. All three read numbers the visitor already has, so they can be right on day one.
	 */
	recastLedger: {
		slug: 'mortgage-recast-ledger',
		category: 'CAPITAL STRUCTURE',
		title: 'Recast vs Refinance Ledger',
		description:
			'Keep a legacy note rate and re-amortize the balance. Computes relief per dollar curtailed, then prices the refinance you would be giving up.',
		metricsPreview: 'Relief = Curtailment × PaymentFactor(rate, months remaining)',
		href: '/calculators/recast-vs-refinance/'
	},
	floatingRate: {
		slug: 'floating-rate-stress-test',
		category: 'CARRY COST',
		title: 'Floating-Rate Stress Test',
		description:
			'Price a HELOC or ARM at +25, +50, +100 and +200 basis points, inside the caps the contract actually allows.',
		metricsPreview: 'Monthly Δ = Balance × ΔRate / 12, capped by the lifetime ceiling',
		href: '/calculators/heloc-arm-stress/'
	},
	coverageGap: {
		slug: 'coverage-gap-audit',
		category: 'CARRY COST',
		title: 'Insurance Coverage Gap Audit',
		description:
			'Turn percentage deductibles and an actual-cash-value roof into the cash you would need on the day of a loss.',
		metricsPreview: 'Out-of-pocket = Coverage A × Peril Deductible % + Depreciation Gap',
		href: '/calculators/insurance-coverage-gap/'
	},

	/** Wave 2 — ownership cost, concessions and claims. */
	escrowTrueCost: {
		slug: 'escrow-true-cost',
		category: 'OWNERSHIP COST',
		title: 'True Cost of Ownership',
		description:
			'Unbundles escrow into five rows, including the tax step-up a listing hides and the special assessment a thin HOA reserve implies.',
		metricsPreview: 'Outflow = (P + I) + T_reassessed + I_indexed + HOA + M_predictive',
		href: '/calculators/true-cost-of-ownership/'
	},
	outflowParity: {
		slug: 'outflow-parity-ledger',
		category: 'MOVE VS IMPROVE',
		title: 'Rent vs Buy, Outflow Parity',
		description:
			'Both paths start with the same cash; the cheaper one invests the difference. Returns the year the two portfolios cross.',
		metricsPreview: 'W_own(t) − W_rent(t) > 0 → the break-even holding period',
		href: '/calculators/rent-vs-buy/'
	},
	concessionArb: {
		slug: 'concession-buydown-arbitrage',
		category: 'OWNERSHIP COST',
		title: 'Seller Concession Arbitrage',
		description:
			'Twenty thousand dollars can cut the price, buy points, or fund a 2-1 buydown. Three different five-year answers, one credit.',
		metricsPreview: 'Path comparison on one credit, including the tax basis it leaves behind',
		href: '/calculators/seller-concession/'
	},
	claimSelfPay: {
		slug: 'claim-or-self-pay',
		category: 'CARRY COST',
		title: 'Claim or Self-Pay',
		description:
			'Prices the five-year premium penalty of filing, then returns the repair figure below which writing a check is cheaper.',
		metricsPreview: 'Absorb ceiling = Deductible + E[five-year penalty]',
		href: '/calculators/claim-or-self-pay/'
	},
	sinkingFund: {
		slug: 'capex-sinking-fund',
		category: 'CAPEX UNDERWRITING',
		title: 'Capital Sinking Fund',
		description:
			'Maps every system in the house to its wear-out window, then sets the monthly contribution that keeps a failure off a credit card.',
		metricsPreview: 'Contribution = Σ(replacement × hazard) / months to expected failure',
		href: '/calculators/capital-sinking-fund/'
	},

	/** Wave 3 — jurisdiction, evidence, financing. */
	taxAppeal: {
		slug: 'assessment-appeal-audit',
		category: 'PROPERTY TAX',
		title: 'Assessment Appeal Audit',
		description:
			'Converts an assessed value into the market value the county is implying, tests it against your own comps, and prices the filing.',
		metricsPreview: 'Implied FMV = Assessed Value / Assessment Ratio',
		href: '/calculators/property-tax-appeal/'
	},
	downPayment: {
		slug: 'down-payment-arbitrage',
		category: 'OWNERSHIP COST',
		title: 'Down Payment and PMI Arbitrage',
		description:
			'Compares cash retained against mortgage insurance paid, down to the month the premium cancels itself.',
		metricsPreview: 'Cumulative PMI vs reserves retained at closing',
		href: '/calculators/down-payment/'
	},
	permitRisk: {
		slug: 'permit-regularization-risk',
		category: 'CAPEX UNDERWRITING',
		title: 'Unpermitted Work Risk',
		description:
			'Prices the permit you skipped: the double fee, the destructive inspection, and the square footage an appraiser will not count.',
		metricsPreview: 'Retro cost = 2 × Fee + Engineer + Exposure + P(fail) × Remediation',
		href: '/calculators/unpermitted-work/'
	},
	touArbitrage: {
		slug: 'tou-load-arbitrage',
		category: 'ENERGY',
		title: 'Time-of-Use Load Arbitrage',
		description:
			'Compares your flat rate against a time-of-use tariff, and finds the peak share above which the switch costs you money.',
		metricsPreview: 'Peak ceiling = the load share where TOU cost equals flat cost',
		href: '/calculators/tou-ev-arbitrage/'
	}
} as const satisfies Record<string, VibeAsset>;

/** Every asset, in hub display order: live engines first, then by wave. */
export const vibeAssetList: VibeAsset[] = [
	vibeAssets.equityArv,
	vibeAssets.relocationFriction,
	vibeAssets.remodelytics,
	vibeAssets.recastLedger,
	vibeAssets.floatingRate,
	vibeAssets.coverageGap,
	vibeAssets.escrowTrueCost,
	vibeAssets.outflowParity,
	vibeAssets.concessionArb,
	vibeAssets.claimSelfPay,
	vibeAssets.sinkingFund,
	vibeAssets.taxAppeal,
	vibeAssets.downPayment,
	vibeAssets.permitRisk,
	vibeAssets.touArbitrage
];

export type VibeAssetSlug = (typeof vibeAssets)[keyof typeof vibeAssets]['slug'];
