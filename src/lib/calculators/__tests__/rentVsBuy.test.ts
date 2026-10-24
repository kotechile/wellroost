import { describe, expect, it } from 'vitest';
import { runRentVsBuy, type RentVsBuyInputs } from '../rentVsBuy';

const base: RentVsBuyInputs = {
	price: 417500,
	downShare: 0.1,
	rate: 0.0732,
	termMonths: 360,
	buyClosingShare: 0.03,
	rentMonthly: 2400,
	rentGrowth: 0.03,
	appreciation: 0.0165,
	investReturn: 0.06,
	sellFriction: 0.07,
	maintenanceShare: 0.01,
	insuranceAnnual: 3057,
	taxRate: 0.011,
	magi: 95000,
	filingStatus: 'single',
	stateIncomeTax: 5200,
	horizonYears: 15
};

describe('rentVsBuy', () => {
	it('starts both paths with the same liquid capital', () => {
		const result = runRentVsBuy(base);
		expect(result.upfront.renter).toBeCloseTo(result.upfront.buyer, 6);
		expect(result.upfront.buyer).toBeCloseTo(417500 * (0.1 + 0.03), 2);
	});

	it('produces one row per year of the horizon', () => {
		const result = runRentVsBuy(base);
		expect(result.series).toHaveLength(15);
		expect(result.terminal).toHaveLength(4);
	});

	it('credits the owner with a modelled tax shield, not zero', () => {
		const result = runRentVsBuy(base);
		expect(result.lifetimeShield).toBeGreaterThan(0);
	});

	it('does not let higher appreciation delay the crossing', () => {
		const result = runRentVsBuy(base);
		const onePercent = result.sensitivity.filter((cell) => cell.appreciation === 0.01);
		const highGrowth = result.sensitivity.filter((cell) => cell.appreciation === 0.023);
		for (let index = 0; index < 3; index += 1) {
			const slow = onePercent[index].breakEvenYear ?? 99;
			const fast = highGrowth[index].breakEvenYear ?? 99;
			expect(fast).toBeLessThanOrEqual(slow);
		}
	});

	it('reports the sensitivity grid as nine cells', () => {
		const result = runRentVsBuy(base);
		expect(result.sensitivity).toHaveLength(9);
	});

	it('returns a null crossing rather than a number beyond the horizon', () => {
		const result = runRentVsBuy({ ...base, appreciation: -0.02, horizonYears: 5 });
		expect(result.breakEvenYear === null || result.breakEvenYear <= 5).toBe(true);
	});
});
