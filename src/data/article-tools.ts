/**
 * Which calculator belongs at the end of which article.
 *
 * The measured problem: of 44 posts, 3 carried a contextual link into a calculator. Every article
 * already renders a flat list of all fifteen engines in the sidebar, which is boilerplate — the same
 * fifteen anchors on every page tell a search engine nothing about what the piece is about, and give
 * the reader a menu instead of a next step. A link that names *this* number is worth more than
 * fifteen that name every number.
 *
 * `slug` is the WordPress post slug. The tool slugs are the same `toolSlug` values as
 * `registry.ts` — a typo would silently render nothing, so `toolsForPost` drops unknown slugs and
 * `article-tools.test.ts` asserts every key and value resolves.
 *
 * Long term this pairing belongs in the CMS (a `calculators` taxonomy on the post, or a custom
 * field), because it is editorial data and the editorial system is WordPress. This file is the
 * seed for that migration, and the place to keep it while the CMS field does not exist. When the
 * field lands, this map becomes the import script's source, not a second source of truth.
 *
 * `note` is reader-facing copy and passes `npm run copy:check`: one sentence, the number it names,
 * no adjective doing the work of evidence.
 */
export interface ArticleTool {
	/** `toolSlug` from the engine registry. */
	tool: string;
	/** Why this reader would want this number. Printed under the link. */
	note: string;
}

export const articleTools: Record<string, ArticleTool[]> = {
	// ── insurance: the claim and the coverage gap ──────────────────────────────────────────────
	'your-nonrenewal-isnt-final-count-120-days': [
		{ tool: 'insurance-coverage-gap', note: 'What the deductible takes out of a claim on the same policy.' }
	],
	'your-5-deductible-risks-your-claim': [
		{ tool: 'insurance-coverage-gap', note: 'The cash the percentage deductible leaves you holding, by peril.' }
	],
	'your-49-discount-isnt-all-roof': [
		{ tool: 'insurance-coverage-gap', note: 'Actual cash value against replacement cost, priced on a roof of your age.' }
	],
	'roof-claim-hidden-second-check-12-months': [
		{ tool: 'claim-or-self-pay', note: 'Whether one claim costs more in premium than the repair you would absorb.' }
	],
	'your-blocks-30b-hardening-bill': [
		{ tool: 'insurance-coverage-gap', note: 'How mitigation changes the deductible and the cash call that remains.' }
	],
	'silent-15400-home-loss': [
		{ tool: 'claim-or-self-pay', note: 'The ceiling on a water claim: file, or pay it and keep the history clean.' }
	],
	'water-leak-monitor-rate-threshold': [
		{ tool: 'claim-or-self-pay', note: 'Where a leak stops being worth a claim, given your own premium and deductible.' }
	],
	'california-fair-plan-premiums-jump-291-oct-15-your-exit-strategy': [
		{ tool: 'insurance-coverage-gap', note: "The gap between the FAIR Plan's settlement and what a rebuild costs." },
		{ tool: 'true-cost-of-ownership', note: 'The premium inside the monthly outflow the listing does not print.' }
	],

	// ── energy: tariffs, load and payback ─────────────────────────────────────────────────────
	'battery-payback-five-state-gap': [
		{ tool: 'tou-ev-arbitrage', note: 'Whether a time-of-use tariff pays at your peak share, state by state.' }
	],
	'your-ev-is-now-a-home-battery-behind-a-paywall': [
		{ tool: 'tou-ev-arbitrage', note: 'What peak-share your charging has to clear for the tariff to pay.' }
	],
	'panel-upgrade-80-percent-test': [
		{ tool: 'tou-ev-arbitrage', note: 'Cost each way on your bill, and the peak share at which the switch stops paying.' }
	],
	'heat-pumps-just-got-cheaper-to-run-and-pricier-to-buy': [
		{ tool: 'tou-ev-arbitrage', note: 'Running cost against your actual tariff, not the spec sheet.' }
	],
	'heat-pumps-cheaper-to-run-pricier-to-buy': [
		{ tool: 'tou-ev-arbitrage', note: 'Running cost against your actual tariff, not the spec sheet.' }
	],
	'unveiling-the-emporia-vue-3-a-comprehensive-guide-to-home-energy-monitoring': [
		{ tool: 'tou-ev-arbitrage', note: 'The peak share your monitoring needs to find for a tariff switch to pay.' }
	],
	'ny-heat-pump-rebate-double-payouts-for-sealed-homes': [
		{ tool: 'remodeling-roi', note: 'Payback on the project after the rebate, at your stay horizon.' },
		{ tool: 'tou-ev-arbitrage', note: 'What the rebated system costs to run on your tariff.' }
	],
	'swapping-your-gas-furnace-for-a-heat-pump-tax-credit-2026-just': [
		{ tool: 'tou-ev-arbitrage', note: 'Annual cost each way once the credit is gone, on your own rates.' }
	],
	'borrow-at-8-to-remodel-or-let-your-battery-earn-on-the-grid': [
		{ tool: 'heloc-arm-stress', note: 'What a floating balance at 8% costs at the next four rate steps.' }
	],

	// ── capital: the reserve and the project ───────────────────────────────────────────────────
	'your-remodel-loses-to-149-growth': [
		{ tool: 'move-or-improve', note: 'The five-year ledger for staying and expanding against selling.' },
		{ tool: 'remodeling-roi', note: 'Payback on the project at your own stay horizon.' }
	],
	'windows-13-percent-best-case': [
		{ tool: 'remodeling-roi', note: 'Recovery rate on the windows you were quoted, not the industry average.' }
	],
	'the-remodel-that-pays-you-back-isnt-the-one-you-want': [
		{ tool: 'remodeling-roi', note: 'Value during your stay, recovery rate, and the year it pays back.' }
	],
	'your-75000-btu-tank-venting-trap': [
		{ tool: 'capital-sinking-fund', note: 'The monthly contribution that funds the replacement before it fails.' }
	],
	'cheapest-fuel-priciest-pipe': [
		{ tool: 'capital-sinking-fund', note: 'A 12-month failure calendar for the systems in this house, and the reserve behind it.' }
	],
	'your-550-battery-spare-is-wrong': [
		{ tool: 'capital-sinking-fund', note: 'What the replacement actually costs per month across every system in the house.' }
	],
	'your-50-meter-reads-78-its-metal': [
		{ tool: 'true-cost-of-ownership', note: 'Five rows of monthly outflow, including the tax step-up after reassessment.' }
	],
	'3-percent-cap-never-covers-your-addition': [
		{ tool: 'property-tax-appeal', note: 'The market value your assessment implies, tested against your own comps.' }
	]
};

/** Tools for one post, with any unknown slug dropped rather than rendered as a dead link. */
export function toolsForPost(slug: string): ArticleTool[] {
	return articleTools[slug] ?? [];
}

/** How many posts carry a curated pairing — printed by `scripts/link-audit.mjs`. */
export const mappedPostCount = Object.keys(articleTools).length;
