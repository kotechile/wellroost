import { describe, expect, it } from 'vitest';
import { rateToMatchPayment, runRecast } from '../recast';

/**
 * The fixtures come from the plan's ledger, computed independently. The case is a real shape: a
 * $400,000 note at 3.25% that has run three years, so the unpaid principal is $375,173.23 and the
 * remaining term is 324 months.
 */
const base = {
	balance: 375173.23,
	noteRate: 0.0325,
	monthsRemaining: 324,
	curtailment: 50000,
	servicerFee: 250,
	marketRate: 0.0732,
	refiClosingShare: 0.03,
	deployReturn: 0.04,
	loanType: 'conventional' as const,
	targetRelief: 400
};

describe('recast', () => {
	it('prices the existing note at 1,740.83 and the re-amortized one at 1,508.82', () => {
		const result = runRecast(base);
		expect(result.baselinePayment).toBeCloseTo(1740.83, 2);
		expect(result.recastPayment).toBeCloseTo(1508.82, 2);
		expect(result.reliefMonthly).toBeCloseTo(232.0, 1);
	});

	it('pays the servicer fee back in about five weeks', () => {
		const result = runRecast(base);
		expect(result.paybackMonths).toBeCloseTo(1.08, 2);
	});

	it('solves the inverse: 400 of relief needs about 86,200 curtailed', () => {
		const result = runRecast(base);
		expect(result.curtailmentForTarget).toBeCloseTo(86205, -2);
		expect(result.targetShortfall).toBeCloseTo(36205, -2);
	});

	it('holds relief proportional to curtailment, independent of the balance', () => {
		const small = runRecast({ ...base, balance: 200000 });
		const large = runRecast({ ...base, balance: 700000 });
		expect(small.reliefMonthly).toBeCloseTo(large.reliefMonthly, 6);
	});

	it('prices a refinance at market as worse on payment, at the same term', () => {
		const result = runRecast(base);
		expect(result.refinance.paymentSameTerm).toBeGreaterThan(result.baselinePayment);
		expect(result.refinance.closingCost).toBeCloseTo(375173.23 * 0.03, 2);
	});

	it('finds the refinance rate that would match the recast payment over 30 years', () => {
		const result = runRecast(base);
		expect(result.refinance.rateToMatchRecast).not.toBeNull();
		// A 30-year refi matching a 324-month payment at 3.25% needs a rate far below market. The
		// exact figure is a bisection result; assert the shape rather than a magic constant.
		expect(result.refinance.rateToMatchRecast ?? 1).toBeLessThan(0.035);
	});

	it('flags FHA as ineligible while still computing the arithmetic', () => {
		const result = runRecast({ ...base, loanType: 'fha' });
		expect(result.eligible).toBe(false);
		expect(result.gates.length).toBeGreaterThan(0);
		expect(result.reliefMonthly).toBeCloseTo(232.0, 1);
	});

	it('flags an above-baseline conventional loan without suppressing the numbers', () => {
		const result = runRecast({ ...base, balance: 900000 });
		expect(result.gates.some((gate) => gate.includes('conforming baseline'))).toBe(true);
	});

	it('returns a null rate when the target payment is below a zero-interest payment', () => {
		expect(rateToMatchPayment(100000, 100, 360)).toBeNull();
	});
});
