import { describe, expect, it } from 'vitest';
import { rateReduction, runConcession, type ConcessionInputs } from '../concessionBuydown';

const base: ConcessionInputs = {
	price: 417500,
	downShare: 0.1,
	noteRate: 0.0732,
	credit: 20000,
	holdMonths: 60,
	refiCreditsPayoff: true,
	bpsPerPoint: 25,
	effectiveTaxRate: 0.011
};

describe('concessionBuydown', () => {
	it('prices the price-cut path at 2,457.49', () => {
		const result = runConcession(base);
		expect(result.paths.priceCut.loan).toBeCloseTo(357750, 2);
		expect(result.paths.priceCut.payment).toBeCloseTo(2457.49, 2);
	});

	it('flattens the points curve instead of buying 25bps forever', () => {
		const result = runConcession(base);
		// 5.32 points: two at 25bps, the rest at 12.5bps, capped at 2% of rate.
		expect(result.paths.points.steadyRate).toBeCloseTo(0.0732 - 0.009153, 4);
		expect(rateReduction(10, 25)).toBeLessThanOrEqual(0.02);
	});

	it('costs 8,884 to fund a 2-1 buydown on a 375,750 loan at 7.32%', () => {
		const result = runConcession(base);
		expect(result.paths.buydown.escrowCost).toBeCloseTo(8884, -1);
		expect(result.paths.buydown.yearOne).toBeLessThan(result.paths.buydown.yearTwo);
	});

	it('routes a credit larger than the buydown needs', () => {
		const result = runConcession(base);
		expect(result.paths.buydown.excessCredit).toBeGreaterThan(10000);
		expect(result.paths.buydown.shortfall).toBe(0);
	});

	it('sizes a smaller credit as a shortfall', () => {
		const result = runConcession({ ...base, credit: 5000 });
		expect(result.paths.buydown.shortfall).toBeGreaterThan(0);
		expect(result.paths.buydown.excessCredit).toBe(0);
	});

	it('returns the payoff credit at each exit point, only when the agreement grants it', () => {
		const granted = runConcession(base);
		expect(granted.paths.buydown.payoffCreditAt.months12).toBeGreaterThan(granted.paths.buydown.payoffCreditAt.months24);
		const silent = runConcession({ ...base, refiCreditsPayoff: false });
		expect(silent.paths.buydown.payoffCreditAt.months12).toBe(0);
	});

	it('names one winner and it is one of the three paths', () => {
		const result = runConcession(base);
		expect(['price-cut', 'points', 'buydown']).toContain(result.best);
	});

	it('makes the price cut cheaper on tax as well as on principal', () => {
		const result = runConcession(base);
		expect(result.paths.priceCut.taxOverHold).toBeLessThan(result.paths.points.taxOverHold);
	});
});
