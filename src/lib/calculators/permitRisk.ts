/**
 * Unpermitted work: the cost of the permit you skipped, priced three ways.
 *
 * A skipped permit is not free. It is a loan against a future transaction: the municipality charges a
 * multiple of the original fee to regularise the work, an inspector may require openings in finished
 * walls to see what is inside them, and an appraiser may exclude the square footage from gross living
 * area entirely. The three outcomes — permit now, regularise later, sell as-is — have different costs
 * and different risks, and the middle one is the only one that can be triggered by someone else.
 *
 * Every assumption here is exposed on the page, because the numbers that matter are local: the fee
 * schedule, the penalty multiplier, and how an appraiser in that market treats unpermitted area.
 */
import { presentValue } from './amortization';

export interface PermitInputs {
	sqft: number;
	permitFee: number;
	plansCost: number;
	/** Multiple of the base fee charged for work started without a permit. */
	penaltyMultiplier: number;
	engineerLetter: number;
	/** Cost of opening walls or trenching to expose the work for inspection. */
	destructiveExposure: number;
	codeFailProbability: number;
	remediationCost: number;
	/** Market value per square foot in this submarket. */
	valuePerSqft: number;
	/** Share of the unpermitted area an appraiser will not count, 0.5 to 1. */
	appraisalHaircut: number;
	buyerConcession: number;
	/** Value the work adds to the assessment if it is permitted. */
	assessedIncrease: number;
	effectiveRate: number;
	stayYears: number;
	discountRate: number;
}

export interface PermitPath {
	id: 'permit' | 'retro' | 'as-is';
	label: string;
	upfront: number;
	/** Present value of the tax the work adds while the household stays. */
	taxOverStay: number;
	contingent: number;
	total: number;
	note: string;
}

export interface PermitResult {
	paths: PermitPath[];
	cheapest: PermitPath['id'];
	/** The largest single exposure across the three paths, which is what a buyer inherits. */
	maxExposure: number;
	delta: { permitVsRetro: number; permitVsAsIs: number };
}

export function runPermitRisk(input: PermitInputs): PermitResult {
	const sqft = Math.max(0, input.sqft);
	const taxOnAssessed = presentValue(
		Math.max(0, input.assessedIncrease) * Math.max(0, input.effectiveRate),
		input.discountRate,
		input.stayYears
	);

	const permit: PermitPath = {
		id: 'permit',
		label: 'Permit up front',
		upfront: Math.max(0, input.permitFee) + Math.max(0, input.plansCost),
		taxOverStay: taxOnAssessed,
		contingent: 0,
		total: Math.max(0, input.permitFee) + Math.max(0, input.plansCost) + taxOnAssessed,
		note: 'The work is legal from day one, insurable, and counts toward gross living area at resale.'
	};

	const retro: PermitPath = {
		id: 'retro',
		label: 'Regularise later',
		upfront: Math.max(0, input.permitFee) * Math.max(1, input.penaltyMultiplier) + Math.max(0, input.engineerLetter),
		taxOverStay: 0,
		contingent:
			Math.max(0, input.destructiveExposure) +
			Math.min(1, Math.max(0, input.codeFailProbability)) * Math.max(0, input.remediationCost),
		total:
			Math.max(0, input.permitFee) * Math.max(1, input.penaltyMultiplier) +
			Math.max(0, input.engineerLetter) +
			Math.max(0, input.destructiveExposure) +
			Math.min(1, Math.max(0, input.codeFailProbability)) * Math.max(0, input.remediationCost) +
			taxOnAssessed,
		note: 'The municipality charges a multiple of the original fee, and the inspector decides how much wall comes off.'
	};

	const asIs: PermitPath = {
		id: 'as-is',
		label: 'Sell as-is',
		upfront: 0,
		taxOverStay: 0,
		contingent:
			sqft * Math.max(0, input.valuePerSqft) * Math.min(1, Math.max(0, input.appraisalHaircut)) +
			Math.max(0, input.buyerConcession),
		total:
			sqft * Math.max(0, input.valuePerSqft) * Math.min(1, Math.max(0, input.appraisalHaircut)) +
			Math.max(0, input.buyerConcession),
		note: 'The area is excluded from gross living area, and a buyer prices the risk into the offer.'
	};

	const paths = [permit, retro, asIs];
	const cheapest = paths.reduce((best, path) => (path.total < best.total ? path : best));

	return {
		paths,
		cheapest: cheapest.id,
		maxExposure: Math.max(...paths.map((path) => path.total)),
		delta: {
			permitVsRetro: retro.total - permit.total,
			permitVsAsIs: asIs.total - permit.total
		}
	};
}
