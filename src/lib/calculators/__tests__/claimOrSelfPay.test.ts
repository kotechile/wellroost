import { describe, expect, it } from 'vitest';
import { nonrenewalProbability, runClaimDecision, type ClaimInputs } from '../claimOrSelfPay';

const base: ClaimInputs = {
	damage: 6500,
	deductible: 2500,
	premium: 3057,
	priorClaims: 0,
	peril: 'wind-hail',
	roofAge: 12,
	surcharge: 0.34,
	fairPlanPremium: 6800,
	discountRate: 0.045,
	insuranceInflation: 0.06
};

describe('claimOrSelfPay', () => {
	it('pays the carrier amount net of the deductible', () => {
		expect(runClaimDecision(base).payout).toBe(4000);
	});

	it('says self-pay on a small loss against a real premium', () => {
		const result = runClaimDecision(base);
		expect(result.verdict).toBe('self-pay');
		expect(result.ceiling).toBeGreaterThan(6500);
	});

	it('raises the non-renewal probability with prior claims and roof age', () => {
		expect(nonrenewalProbability(base)).toBeCloseTo(0.06, 6);
		expect(nonrenewalProbability({ ...base, priorClaims: 1, roofAge: 18 })).toBeCloseTo(0.56, 6);
		expect(nonrenewalProbability({ ...base, priorClaims: 4, roofAge: 20 })).toBeLessThanOrEqual(0.85);
	});

	it('returns a band rather than a single confident ceiling', () => {
		const result = runClaimDecision(base);
		expect(result.ceilingBand.low).toBeLessThan(result.ceiling);
		expect(result.ceilingBand.high).toBeGreaterThan(result.ceiling);
	});

	it('flips to filing when the loss dwarfs the penalty', () => {
		const result = runClaimDecision({ ...base, damage: 60000 });
		expect(result.verdict).toBe('file');
		expect(result.netBenefitOfFiling).toBeGreaterThan(0);
	});

	it('does not manufacture a penalty when the state insurer is cheaper', () => {
		const result = runClaimDecision({ ...base, fairPlanPremium: 1200 });
		expect(result.npvNonrenewal).toBeLessThan(result.npvSurcharge * 5);
	});
});
