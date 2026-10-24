/**
 * Claim or self-pay: the price of filing one claim.
 *
 * A homeowners policy does not reprice the month a claim is filed. It reprices at renewal, and the
 * surcharge follows the household for the five years a claim stays on a CLUE report. For a small
 * loss, the arithmetic therefore usually favours absorbing it — but nobody can see the crossover
 * without modelling it, so people file a $6,000 claim against a $2,500 deductible and pay for it
 * until the claim ages off.
 *
 * The uncertainty here is not in the arithmetic, it is in the probability of non-renewal. Rather than
 * print an invented percentage to two significant figures, the engine:
 *
 * - exposes the base probabilities as named assumptions,
 * - returns a ceiling *band* at ±50% on that probability, and
 * - makes the ceiling, not the probability, the headline. The band is what tells a household whether
 *   the answer is robust or whether it is sitting on the edge.
 *
 * It also refuses a quiet piece of cheating: the earlier draft of this model floored the non-renewal
 * penalty at 75% of the baseline premium, which manufactures a large penalty in cases where the
 * state insurer of last resort is cheap. There is no floor here; the spread is the spread.
 */
import { presentValue } from './amortization';

export type ClaimPeril = 'wind-hail' | 'water' | 'liability-fire';

export interface ClaimInputs {
	damage: number;
	deductible: number;
	premium: number;
	priorClaims: number;
	peril: ClaimPeril;
	roofAge: number;
	/** Surcharge plus the lost claims-free discount, as a share of premium. */
	surcharge: number;
	/** Annual premium with the state insurer of last resort, if the policy is non-renewed. */
	fairPlanPremium: number;
	discountRate: number;
	/** Baseline premium inflation. */
	insuranceInflation: number;
}

export interface ClaimResult {
	/** What the carrier pays if the claim is filed. */
	payout: number;
	nonrenewalProbability: number;
	/** Present value of the surcharge if the policy is kept. */
	npvSurcharge: number;
	/** Present value of the penalty if the policy is non-renewed. */
	npvNonrenewal: number;
	/** Probability-weighted five-year penalty. */
	expectedPenalty: number;
	/** Damage below which self-paying is cheaper over five years. */
	ceiling: number;
	/** The same ceiling at ±50% on the non-renewal probability. */
	ceilingBand: { low: number; high: number };
	netBenefitOfFiling: number;
	verdict: 'self-pay' | 'borderline' | 'file';
	probabilityBasis: string;
}

const BASE_PROBABILITY: Record<ClaimPeril, number> = {
	'wind-hail': 0.06,
	water: 0.18,
	'liability-fire': 0.25
};

export function nonrenewalProbability(input: ClaimInputs): number {
	const base = BASE_PROBABILITY[input.peril];
	const prior = 0.35 * Math.max(0, input.priorClaims);
	const roof = input.roofAge >= 15 ? 0.15 : 0;
	return Math.min(0.85, base + prior + roof);
}

function expectedPenaltyAt(input: ClaimInputs, probability: number): {
	npvSurcharge: number;
	npvNonrenewal: number;
	expected: number;
} {
	const npvSurcharge = presentValue(input.premium * (1 + input.insuranceInflation) * input.surcharge, input.discountRate, 5);

	let npvNonrenewal = 0;
	for (let year = 1; year <= 5; year += 1) {
		const baseline = input.premium * Math.pow(1 + input.insuranceInflation, year);
		const factor = Math.pow(1 + input.discountRate, year);
		if (year <= 3) {
			// Non-renewed: the household pays the insurer of last resort for three years. No floor, no
			// manufactured penalty — if the FAIR plan is cheaper, the spread is negative and the model
			// says so.
			npvNonrenewal += Math.max(0, input.fairPlanPremium * Math.pow(1 + input.insuranceInflation, year - 1) - baseline) / factor;
		} else {
			npvNonrenewal += (baseline * input.surcharge) / factor;
		}
	}

	return {
		npvSurcharge,
		npvNonrenewal,
		expected: (1 - probability) * npvSurcharge + probability * npvNonrenewal
	};
}

export function runClaimDecision(input: ClaimInputs): ClaimResult {
	const probability = nonrenewalProbability(input);
	const base = expectedPenaltyAt(input, probability);
	const low = expectedPenaltyAt(input, Math.max(0, probability * 0.5));
	const high = expectedPenaltyAt(input, Math.min(0.9, probability * 1.5));

	const payout = Math.max(0, input.damage - input.deductible);
	const ceiling = Math.max(0, input.deductible) + base.expected;
	const band = {
		low: Math.max(0, input.deductible) + low.expected,
		high: Math.max(0, input.deductible) + high.expected
	};

	const verdict: ClaimResult['verdict'] =
		input.damage <= ceiling ? 'self-pay' : input.damage <= ceiling + 2500 ? 'borderline' : 'file';

	return {
		payout,
		nonrenewalProbability: probability,
		npvSurcharge: base.npvSurcharge,
		npvNonrenewal: base.npvNonrenewal,
		expectedPenalty: base.expected,
		ceiling,
		ceilingBand: band,
		netBenefitOfFiling: payout - base.expected,
		verdict,
		probabilityBasis:
			'Base 6% wind or hail, 18% interior water, 25% fire or liability. Add 35 points per prior claim and 15 for a roof at 15 years or older. These are modelling assumptions, not carrier rate filings.'
	};
}
