import { describe, expect, it } from 'vitest';
import { defaultComponents, medianLife, reserveMonthly, runSinkingFund, windowProbability } from '../sinkingFund';

describe('sinkingFund', () => {
	it('raises the failure probability with age', () => {
		const young = windowProbability(2, 9, 1, 3);
		const old = windowProbability(8, 9, 1, 3);
		expect(old).toBeGreaterThan(young);
	});

	it('reaches certainty at the far end of the distribution', () => {
		expect(windowProbability(40, 9, 1, 3)).toBeGreaterThan(0.99);
	});

	it('puts the median before the characteristic life for a wear-out curve', () => {
		expect(medianLife(10, 3)).toBeCloseTo(8.85, 2);
		expect(medianLife(10, 3)).toBeLessThan(10);
	});

	it('funds a house, not a single appliance', () => {
		const result = runSinkingFund({ components: defaultComponents(), horizonYears: 5, shape: 3 });
		expect(result.rows).toHaveLength(7);
		expect(result.monthly).toBeGreaterThan(50);
		expect(result.monthly).toBeLessThan(500);
		expect(result.next.length).toBeGreaterThan(0);
	});

	it('asks for less per month when the window is longer', () => {
		const one = reserveMonthly(defaultComponents(), 1);
		const five = reserveMonthly(defaultComponents(), 5);
		expect(one).toBeGreaterThan(five);
	});

	it('prices the borrowing alternative', () => {
		const result = runSinkingFund({ components: defaultComponents(), horizonYears: 3, shape: 3 });
		expect(result.debtInterest).toBeGreaterThan(0);
	});
});
