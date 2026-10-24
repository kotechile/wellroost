import { describe, expect, it } from 'vitest';
import { runFloatingRate, type FloatingRateInputs } from '../floatingRate';

const heloc: FloatingRateInputs = {
	product: 'heloc-draw',
	balance: 44000,
	currentRate: 0.074,
	lifetimeCapRate: 0.18,
	periodicCap: 0.02,
	monthsToReset: 6,
	amortizeMonths: 240,
	monthlyCushion: 50
};

describe('floatingRate', () => {
	it('prices 44,000 interest-only at 271.33 and +25bps at 280.50', () => {
		const result = runFloatingRate(heloc);
		expect(result.currentPayment).toBeCloseTo(271.33, 2);
		const step25 = result.steps.find((step) => step.bps === 25);
		expect(step25?.payment).toBeCloseTo(280.5, 2);
		expect(step25?.deltaPayment).toBeCloseTo(9.17, 2);
	});

	it('reports extra cash over a year, not extra interest', () => {
		const result = runFloatingRate(heloc);
		const step100 = result.steps.find((step) => step.bps === 100);
		expect(step100?.extraCash12).toBeCloseTo((step100?.deltaPayment ?? 0) * 12, 6);
	});

	it('blocks a step beyond the lifetime ceiling instead of projecting it', () => {
		const result = runFloatingRate({ ...heloc, lifetimeCapRate: 0.08 });
		const step200 = result.steps.find((step) => step.bps === 200);
		expect(step200?.blocked).toBe(true);
		expect(step200?.deltaPayment).toBe(0);
	});

	it('finds the cushion ceiling by solving the payment function', () => {
		const result = runFloatingRate({ ...heloc, monthlyCushion: 380 });
		// 0.3667 of payment per basis point: $380 of cushion is about 1,037 bps, and the 18% ceiling
		// is only 1,060 bps away, which is what makes this a useful case rather than a comfortable one.
		expect(result.cushionBps).toBeGreaterThanOrEqual(1030);
		expect(result.cushionBps).toBeLessThanOrEqual(1045);
	});

	it('counts resets the cushion can absorb', () => {
		// One 200bp adjustment adds $73.33 a month on a $44,000 line.
		expect(runFloatingRate(heloc).verdict).toBe('exposed');
		expect(runFloatingRate({ ...heloc, monthlyCushion: 100 }).verdict).toBe('watch');
		expect(runFloatingRate({ ...heloc, monthlyCushion: 200 }).verdict).toBe('stable');
		expect(runFloatingRate({ ...heloc, monthlyCushion: 0 }).verdict).toBe('stable');
	});

	it('prices the lifetime ceiling on an amortizing ARM', () => {
		const result = runFloatingRate({
			...heloc,
			product: 'arm',
			balance: 375000,
			currentRate: 0.0685,
			lifetimeCapRate: 0.1185,
			amortizeMonths: 324
		});
		expect(result.lifetimeCapPayment).toBeGreaterThan(result.currentPayment);
		expect(result.amortizingPayment).toBeGreaterThan(result.interestOnlyPayment);
	});
});
