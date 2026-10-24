/**
 * Property tax appeal: is the roll wrong, and by how much?
 *
 * The engine does three things an owner cannot do by hand, and refuses a fourth it cannot do
 * honestly.
 *
 * It converts. An assessed value divided by the statutory ratio is the market value the county is
 * asserting. In a 25% state, a $100,000 assessment is a claim that the house is worth $400,000, and
 * most owners have never seen their own number stated that way.
 *
 * It adjusts. Comparable sales are not identical to the subject, so each comp is brought to the
 * subject's features at explicit dollar rates the visitor can see and change — price per square
 * foot, per bedroom, per bathroom, per garage stall.
 *
 * It prices the filing. A reduction is an annual tax delta, so the value of appealing is a present
 * value, less the filing fee and any contingency.
 *
 * What it refuses: sourcing the comps. There is no MLS feed behind this site, and inventing
 * comparables would be fabrication dressed as analysis. The visitor supplies three to six, and the
 * engine says plainly that the answer is their evidence.
 */
import {
	annualTax,
	defaultEffectiveRate,
	impliedMarketValue,
	jurisdictionById,
	JURISDICTIONS,
	type Jurisdiction
} from './data/jurisdictions';
import { presentValue } from './amortization';

export interface Comp {
	price: number;
	sqft: number;
	beds: number;
	baths: number;
	garage: number;
	/** Months since the sale. Used only to flag staleness. */
	monthsAgo: number;
}

export interface Subject {
	sqft: number;
	beds: number;
	baths: number;
	garage: number;
}

export interface TaxAppealInputs {
	jurisdictionId: string;
	assessedValue: number;
	/** Overrides the seeded effective rate. */
	effectiveRate: number | null;
	subject: Subject;
	comps: Comp[];
	filingFee: number;
	/** Share of the first year's savings a representative charges. */
	contingencyShare: number;
	discountRate: number;
	years: number;
}

export interface CompAdjustment {
	index: number;
	price: number;
	sqftAdjustment: number;
	featureAdjustment: number;
	adjusted: number;
	stale: boolean;
}

export interface TaxAppealResult {
	modelable: boolean;
	coverage: string[];
	jurisdiction?: Jurisdiction;
	impliedValue: number;
	adjustments: CompAdjustment[];
	medianAdjusted: number;
	/** Dollars of market value the county is overstating. Negative means the roll is low. */
	excess: number;
	varianceShare: number;
	annualDelta: number;
	npv: number;
	firstYearSavings: number;
	costToFile: number;
	verdict: 'file' | 'marginal' | 'below' | 'insufficient';
	/** Per-square-foot rate implied by the comps, which is also the adjustment rate used. */
	compPricePerSqft: number;
}

const STALE_MONTHS = 12;

export function runTaxAppeal(input: TaxAppealInputs): TaxAppealResult {
	const jurisdiction = jurisdictionById(input.jurisdictionId);
	const empty: TaxAppealResult = {
		modelable: false,
		coverage: JURISDICTIONS.map((item) => item.label),
		impliedValue: 0,
		adjustments: [],
		medianAdjusted: 0,
		excess: 0,
		varianceShare: 0,
		annualDelta: 0,
		npv: 0,
		firstYearSavings: 0,
		costToFile: 0,
		verdict: 'insufficient',
		compPricePerSqft: 0
	};
	if (!jurisdiction) return empty;

	const usable = input.comps.filter((comp) => comp.price > 0 && comp.sqft > 0);
	const rate = input.effectiveRate ?? defaultEffectiveRate(jurisdiction);
	const impliedValue = impliedMarketValue(input.assessedValue, jurisdiction);

	if (usable.length < 3) {
		return { ...empty, modelable: true, jurisdiction, impliedValue, verdict: 'insufficient' };
	}

	// The adjustment rate comes from the comps themselves, not from a national figure: the median
	// price per square foot of the evidence supplied. Using the subject's own ratio would bake the
	// county's number into the correction for it.
	const pricePerSqft = median(usable.map((comp) => comp.price / comp.sqft));
	const bedValue = pricePerSqft * 180;
	const bathValue = pricePerSqft * 120;
	const garageValue = pricePerSqft * 140;

	const adjustments: CompAdjustment[] = usable.map((comp, index) => {
		const sqftAdjustment = (input.subject.sqft - comp.sqft) * pricePerSqft;
		const featureAdjustment =
			(input.subject.beds - comp.beds) * bedValue +
			(input.subject.baths - comp.baths) * bathValue +
			(input.subject.garage - comp.garage) * garageValue;
		return {
			index: index + 1,
			price: comp.price,
			sqftAdjustment,
			featureAdjustment,
			adjusted: comp.price + sqftAdjustment + featureAdjustment,
			stale: comp.monthsAgo > STALE_MONTHS
		};
	});

	const medianAdjusted = median(adjustments.map((row) => row.adjusted));
	const excess = impliedValue - medianAdjusted;
	const varianceShare = impliedValue > 0 ? excess / impliedValue : 0;

	// A reduction of `excess` in market value cuts the tax by excess × effective rate. The rate is
	// published against market value, so it is applied once, not through the ratio as well.
	const annualDelta = excess * rate;
	const firstYearSavings = Math.max(0, annualDelta);
	const npv = presentValue(firstYearSavings, input.discountRate, input.years) -
		Math.max(0, input.contingencyShare) * firstYearSavings -
		Math.max(0, input.filingFee);

	const verdict: TaxAppealResult['verdict'] =
		varianceShare >= 0.1 ? 'file' : varianceShare >= 0.05 ? 'marginal' : 'below';

	return {
		modelable: true,
		coverage: JURISDICTIONS.map((item) => item.label),
		jurisdiction,
		impliedValue,
		adjustments,
		medianAdjusted,
		excess,
		varianceShare,
		annualDelta,
		npv,
		firstYearSavings,
		costToFile: Math.max(0, input.filingFee) + Math.max(0, input.contingencyShare) * firstYearSavings,
		verdict,
		compPricePerSqft: pricePerSqft
	};
}

/** The tax the roll currently produces, for the before/after rows on the page. */
export function currentTax(input: TaxAppealInputs, result: TaxAppealResult): number {
	if (!result.jurisdiction) return 0;
	const rate = input.effectiveRate ?? defaultEffectiveRate(result.jurisdiction);
	return annualTax(input.assessedValue / result.jurisdiction.assessmentRatio, result.jurisdiction, rate);
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
