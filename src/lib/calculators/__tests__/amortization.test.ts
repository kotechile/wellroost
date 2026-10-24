import { describe, expect, it } from 'vitest';
import {
	calculateMonthlyPayment,
	calculateProspectiveBalance,
	curtailmentForRelief,
	paymentFactor,
	presentValue
} from '../amortization';

/**
 * Fixtures computed independently of this file (Python, same formula) so a refactor that changes
 * both the code and the expectation cannot pass. These are the numbers the plan's fixture ledger
 * publishes, and the numbers the recast page prints.
 */
describe('amortization', () => {
	it('prices the 360-month note the recast example starts from', () => {
		expect(calculateMonthlyPayment(400000, 0.0325, 360)).toBeCloseTo(1740.83, 2);
	});

	it('prices the same balance over the remaining 324 months', () => {
		expect(calculateMonthlyPayment(400000, 0.0325, 324)).toBeCloseTo(1856.02, 2);
	});

	it('leaves 375,173.23 outstanding after 36 scheduled payments', () => {
		expect(calculateProspectiveBalance(400000, 0.0325, 360, 36)).toBeCloseTo(375173.23, 2);
	});

	it('recasts 325,173.23 over 324 months at 1,508.82', () => {
		expect(calculateMonthlyPayment(325173.23, 0.0325, 324)).toBeCloseTo(1508.82, 2);
	});

	it('holds the recast invariant: relief depends on the curtailment, not the balance', () => {
		const factor = paymentFactor(0.0325, 324);
		expect(50000 * factor).toBeCloseTo(232.0, 1);
		expect(curtailmentForRelief(232.0, 0.0325, 324)).toBeCloseTo(50000, -1);
	});

	it('treats a zero rate as straight-line principal', () => {
		expect(calculateMonthlyPayment(120000, 0, 240)).toBeCloseTo(500, 6);
		expect(calculateProspectiveBalance(120000, 0, 240, 120)).toBeCloseTo(60000, 6);
	});

	it('returns zero at and beyond the end of the term', () => {
		expect(calculateProspectiveBalance(400000, 0.0325, 360, 360)).toBe(0);
		expect(calculateProspectiveBalance(400000, 0.0325, 360, 999)).toBe(0);
	});

	it('discounts a level annual amount', () => {
		expect(presentValue(1000, 0.05, 1)).toBeCloseTo(952.38, 2);
		expect(presentValue(1000, 0, 3)).toBe(3000);
	});
});
