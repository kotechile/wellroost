/**
 * One list of every engine, and the only place the hub reads from.
 *
 * The previous shape paired `calculatorTools[0]` with a hardcoded `vibeAssets` key inside
 * `/calculators/index.astro`. That coupling is how a card slug and an engine slug drift apart —
 * `vibeAssets.ts` documents that exact failure, and could not prevent it while the pairing lived in
 * a page. Declaring `tool` and `asset` together, once, makes the mismatch impossible rather than
 * merely fixed: there is no second literal to forget.
 *
 * `wave` drives display order and the "in build" group. `status` is what the hub filters on, so a
 * planned engine can be named without a dead link to a 404.
 */
import { vibeAssets, type VibeAsset } from '../vibeAssets';

export interface EngineRecord {
	toolSlug: string;
	title: string;
	description: string;
	utility: string;
	applicationCategory: 'FinanceApplication' | 'BusinessApplication';
	keywords: readonly string[];
	/** Short label above the H1 on the engine page. */
	eyebrow: string;
	/** What the visitor has to know before it works. Printed on the hub. */
	takes: string;
	/** What comes back. Printed on the hub. */
	returns: string;
	wave: 1 | 2 | 3;
	status: 'Live' | 'Built' | 'Planned';
	asset: VibeAsset;
}

const live = (record: Omit<EngineRecord, 'status'>): EngineRecord => ({ ...record, status: 'Live' });
const built = (record: Omit<EngineRecord, 'status'>): EngineRecord => ({ ...record, status: 'Built' });

export const engineRegistry: EngineRecord[] = [
	live({
		toolSlug: 'move-or-improve',
		title: 'Move or Improve Calculator',
		description:
			'Compare the 5-year financial projection of renovating your current home versus selling and relocating.',
		utility: 'Choose between home renovation and relocation',
		applicationCategory: 'FinanceApplication',
		keywords: ['move or improve calculator', 'renovate vs relocate', 'remodel vs sell calculator'],
		eyebrow: 'Relocation vs renovation',
		takes: 'Current value, sale friction, next purchase, expansion cost.',
		returns: 'The five-year ledger for staying against moving.',
		wave: 1,
		asset: vibeAssets.relocationFriction
	}),
	live({
		toolSlug: 'remodeling-roi',
		title: 'Remodeling ROI Calculator',
		description:
			'Pressure-test a home upgrade with project cost, resale lift, stay horizon, enjoyment value, and monthly savings.',
		utility: 'Decide if a project is worth it',
		applicationCategory: 'FinanceApplication',
		keywords: ['remodeling ROI calculator', 'home improvement ROI', 'renovation calculator'],
		eyebrow: 'CapEx underwriting',
		takes: 'Project cost, resale lift, years staying, savings, enjoyment.',
		returns: 'Value during your stay, recovery rate, payback, and a verdict.',
		wave: 1,
		asset: vibeAssets.equityArv
	}),
	live({
		toolSlug: 'remodelytics',
		title: 'Remodelytics',
		description:
			'Model remodel ROI, ARV, energy incentives, ADU income, leverage, and over-improvement risk in one platform.',
		utility: 'Run advanced remodel math',
		applicationCategory: 'BusinessApplication',
		keywords: ['Remodelytics', 'home upgrade ROI calculator', 'ARV calculator', 'renovation underwriting'],
		eyebrow: 'Investor-grade underwriting',
		takes: 'After-repair value, cost, rent, financing, combined loan-to-value.',
		returns: 'Maximum allowable offer and the risk flags that cap it.',
		wave: 1,
		asset: vibeAssets.remodelytics
	}),
	live({
		toolSlug: 'recast-vs-refinance',
		title: 'Recast vs Refinance Calculator',
		description:
			'A lump sum against a legacy note rate: what it buys in monthly relief, and what a refinance would cost instead.',
		utility: 'Cut the payment without losing the rate',
		applicationCategory: 'FinanceApplication',
		keywords: ['mortgage recast calculator', 'recast vs refinance', 're-amortize mortgage'],
		eyebrow: 'Capital structure',
		takes: 'Balance, note rate, months remaining, the lump sum, the servicer fee.',
		returns: 'Relief per month, fee payback, and the refi comparison at market.',
		wave: 1,
		asset: vibeAssets.recastLedger
	}),
	live({
		toolSlug: 'heloc-arm-stress',
		title: 'HELOC and ARM Stress Test',
		description:
			'What a floating balance costs at the next four rate steps, and how much movement exhausts your cushion.',
		utility: 'Price a floating rate before it resets',
		applicationCategory: 'FinanceApplication',
		keywords: ['HELOC payment calculator', 'ARM reset calculator', 'variable rate mortgage stress test'],
		eyebrow: 'Carry cost',
		takes: 'Balance, current rate, margin, rate caps, months to reset.',
		returns: 'Payment at each step, extra interest, and the cushion ceiling.',
		wave: 1,
		asset: vibeAssets.floatingRate
	}),
	live({
		toolSlug: 'insurance-coverage-gap',
		title: 'Insurance Coverage Gap Calculator',
		description:
			'Percentage deductibles and actual-cash-value roofs translated into the cash you need on the day of a loss.',
		utility: 'Find the cash a claim leaves you holding',
		applicationCategory: 'FinanceApplication',
		keywords: ['hurricane deductible calculator', 'ACV roof depreciation', 'home insurance coverage gap'],
		eyebrow: 'Carry cost',
		takes: 'Coverage A, deductibles by peril, roof material and age, settlement basis.',
		returns: 'Out-of-pocket per peril, the worst-case cash call, and the depreciation gap.',
		wave: 1,
		asset: vibeAssets.coverageGap
	}),
	built({
		toolSlug: 'true-cost-of-ownership',
		title: 'True Cost of Ownership',
		description:
			'Principal, interest, the reassessed tax, the indexed premium, HOA exposure and a reserve line — five rows, not one number.',
		utility: 'See the payment the listing did not print',
		applicationCategory: 'FinanceApplication',
		keywords: ['true cost of home ownership calculator', 'escrow calculator', 'property tax reassessment'],
		eyebrow: 'Ownership cost',
		takes: 'Price, rate, jurisdiction, insurance quote, HOA reserve status.',
		returns: 'Five-row monthly outflow at years 1, 5 and 10, and the tax step-up.',
		wave: 2,
		asset: vibeAssets.escrowTrueCost
	}),
	built({
		toolSlug: 'rent-vs-buy',
		title: 'Rent vs Buy Calculator',
		description:
			'Outflow parity: both paths start with the same cash, and the cheaper one invests the difference.',
		utility: 'Find the year owning overtakes renting',
		applicationCategory: 'FinanceApplication',
		keywords: ['rent vs buy calculator', 'break even home purchase', 'outflow parity'],
		eyebrow: 'Move vs improve',
		takes: 'Price, down payment, rate, rent, returns, the tax shield.',
		returns: 'The crossing year, terminal wealth both ways, and a sensitivity grid.',
		wave: 2,
		asset: vibeAssets.outflowParity
	}),
	built({
		toolSlug: 'seller-concession',
		title: 'Seller Concession Calculator',
		description:
			'One credit, three destinations: price reduction, permanent points, or a 2-1 temporary buydown.',
		utility: 'Spend the concession where it survives',
		applicationCategory: 'FinanceApplication',
		keywords: ['2-1 buydown calculator', 'seller credit vs price reduction', 'mortgage points break even'],
		eyebrow: 'Ownership cost',
		takes: 'Price, down payment, note rate, the credit, your holding period.',
		returns: 'Payment per path, five-year cash, and what survives a refinance.',
		wave: 2,
		asset: vibeAssets.concessionArb
	}),
	built({
		toolSlug: 'claim-or-self-pay',
		title: 'Claim or Self-Pay Calculator',
		description:
			'The five-year premium penalty of one claim, priced, against the repair you would otherwise absorb.',
		utility: 'Decide whether to file',
		applicationCategory: 'FinanceApplication',
		keywords: ['should I file an insurance claim', 'CLUE report claim', 'insurance claim surcharge'],
		eyebrow: 'Carry cost',
		takes: 'Repair quote, deductible, premium, claims history, roof age.',
		returns: 'The absorb ceiling, the expected penalty, and the verdict.',
		wave: 2,
		asset: vibeAssets.claimSelfPay
	}),
	built({
		toolSlug: 'capital-sinking-fund',
		title: 'Capital Sinking Fund Calculator',
		description:
			'Every system in the house, its wear-out window, and the monthly contribution that funds replacements before they fail.',
		utility: 'Fund the furnace before December',
		applicationCategory: 'FinanceApplication',
		keywords: ['home maintenance sinking fund', 'appliance replacement calculator', 'capital reserve schedule'],
		eyebrow: 'CapEx underwriting',
		takes: 'Component ages, replacement costs, your target window.',
		returns: 'Monthly contribution, a 12-month failure calendar, and the debt counterfactual.',
		wave: 2,
		asset: vibeAssets.sinkingFund
	}),
	built({
		toolSlug: 'property-tax-appeal',
		title: 'Property Tax Appeal Calculator',
		description:
			'The market value your assessment implies, tested against your own comps, with the filing priced.',
		utility: 'Check the assessor’s arithmetic',
		applicationCategory: 'FinanceApplication',
		keywords: ['property tax appeal calculator', 'assessment ratio', 'board of equalization'],
		eyebrow: 'Property tax',
		takes: 'Assessed value, county, three to six comps you supply.',
		returns: 'Implied value, the excess, the annual delta, and an evidence packet.',
		wave: 3,
		asset: vibeAssets.taxAppeal
	}),
	built({
		toolSlug: 'down-payment',
		title: 'Down Payment and PMI Calculator',
		description:
			'Cash retained against mortgage insurance paid, with the month the premium cancels itself and the assistance arithmetic.',
		utility: 'Choose the down payment that survives',
		applicationCategory: 'FinanceApplication',
		keywords: ['PMI calculator', 'down payment assistance', 'LTV cancellation'],
		eyebrow: 'Ownership cost',
		takes: 'Price, rate, down payment tiers, assistance terms.',
		returns: 'Cumulative PMI per tier, the cancellation month, and net assistance cost.',
		wave: 3,
		asset: vibeAssets.downPayment
	}),
	built({
		toolSlug: 'unpermitted-work',
		title: 'Unpermitted Work Calculator',
		description:
			'Permit now, regularize later, or sell as-is: the three costs, including the square footage an appraiser will not count.',
		utility: 'Price the permit you skipped',
		applicationCategory: 'FinanceApplication',
		keywords: ['unpermitted work cost', 'retroactive permit', 'appraisal GLA exclusion'],
		eyebrow: 'CapEx underwriting',
		takes: 'Scope, square footage, permit fee, municipal penalty multiplier.',
		returns: 'Cost per path, the resale haircut, and the exposure you are carrying.',
		wave: 3,
		asset: vibeAssets.permitRisk
	}),
	built({
		toolSlug: 'tou-ev-arbitrage',
		title: 'Time-of-Use Calculator',
		description:
			'Your flat rate against a time-of-use tariff, with the peak share at which the switch stops paying.',
		utility: 'Test the tariff before you opt in',
		applicationCategory: 'FinanceApplication',
		keywords: ['time of use calculator', 'EV charging rate', 'TOU tariff savings'],
		eyebrow: 'Energy',
		takes: 'Three tariff rates from your bill, monthly kWh, EV miles, peak share.',
		returns: 'Annual cost each way, the peak-share ceiling, and a verdict.',
		wave: 3,
		asset: vibeAssets.touArbitrage
	})
];

export const liveEngines = () => engineRegistry.filter((engine) => engine.status === 'Live');
export const builtEngines = () => engineRegistry.filter((engine) => engine.status !== 'Planned');
export const plannedEngines = () => engineRegistry.filter((engine) => engine.status === 'Planned');

/**
 * The hub's grouping. Categories are declared on the asset (they are also the telemetry dimension),
 * so the family map is derived rather than restated — an engine that lands with a new category shows
 * up in "Elsewhere" instead of vanishing, which is the failure a second hand-written list produces.
 */
export const FAMILIES: Array<{ id: string; title: string; blurb: string; categories: string[] }> = [
	{
		id: 'commit',
		title: 'Before you commit capital',
		blurb: 'Projects and moves: what the equity ledger looks like five years out, and what a quote really costs.',
		categories: ['EQUITY ARV', 'MOVE VS IMPROVE', 'CAPEX UNDERWRITING']
	},
	{
		id: 'carry',
		title: 'The monthly bill',
		blurb: 'What the house costs to hold once the mortgage is paid: escrow, insurance, reserves, and the premium a claim buys you.',
		categories: ['CARRY COST', 'OWNERSHIP COST']
	},
	{
		id: 'debt',
		title: 'The loan itself',
		blurb: 'Rate, term, and the lump sum. The only part of the balance sheet where a phone call can move four figures a year.',
		categories: ['CAPITAL STRUCTURE']
	},
	{
		id: 'recurring',
		title: 'Recurring charges worth contesting',
		blurb: 'The county and the utility both price your house without asking. Both numbers can be tested.',
		categories: ['PROPERTY TAX', 'ENERGY']
	}
];

export function enginesByFamily() {
	const seen = new Set<string>();
	const groups = FAMILIES.map((family) => {
		const engines = engineRegistry.filter((engine) => family.categories.includes(engine.asset.category));
		engines.forEach((engine) => seen.add(engine.toolSlug));
		return { ...family, engines };
	}).filter((group) => group.engines.length > 0);

	const orphaned = engineRegistry.filter((engine) => !seen.has(engine.toolSlug));
	if (orphaned.length > 0) {
		groups.push({
			id: 'elsewhere',
			title: 'Elsewhere',
			blurb: 'Engines whose category has no family yet. Add the category to FAMILIES rather than leaving them here.',
			categories: [],
			engines: orphaned
		});
	}
	return groups;
}

export function engineBySlug(slug: string) {
	return engineRegistry.find((engine) => engine.toolSlug === slug);
}
