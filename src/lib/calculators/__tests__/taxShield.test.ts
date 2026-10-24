import { describe, expect, it } from 'vitest';
import { computeTaxShield, deductibleInterestFor, saltCapFor } from '../taxShield';

/**
 * The 2026 SALT cap is $40,400 and phases down above $505,000 of MAGI. Both halves are asserted
 * here, because a page that models only the first half over-pays the shield for exactly the
 * households most likely to read it closely.
 */
describe('taxShield', () => {
	it('applies the full cap below the phase-out threshold', () => {
		expect(saltCapFor(95000)).toBe(40400);
		expect(saltCapFor(505000)).toBe(40400);
	});

	it('phases the cap down 30% of the excess, to a $10,000 floor', () => {
		expect(saltCapFor(560000)).toBeCloseTo(23900, 0);
		// The floor binds from roughly $606,333 of MAGI: 40,400 − 30% of the excess.
		expect(saltCapFor(620000)).toBe(10000);
		expect(saltCapFor(1000000)).toBe(10000);
	});

	it('gives a single filer at the median a real shield, not zero', () => {
		// $417,500 at 10% down, 7.32% → $27,386 year-one interest; 1.1% property tax → $4,592.
		const result = computeTaxShield({
			mortgageInterest: 27386,
			propertyTax: 4592,
			stateIncomeTax: 5200,
			charitable: 0,
			magi: 95000,
			filingStatus: 'single'
		});
		expect(result.saltUsed).toBeCloseTo(9792, 0);
		expect(result.itemized).toBeCloseTo(37178, 0);
		expect(result.excess).toBeCloseTo(21078, 0);
		expect(result.shield).toBeCloseTo(5059, 0);
	});

	it('clears the higher joint hurdle, with a smaller shield', () => {
		const result = computeTaxShield({
			mortgageInterest: 27386,
			propertyTax: 4592,
			stateIncomeTax: 14000,
			charitable: 0,
			magi: 240000,
			filingStatus: 'joint'
		});
		expect(result.excess).toBeCloseTo(13778, 0);
		expect(result.shield).toBeCloseTo(3307, 0);
	});

	it('marks the phase-down on a high earner and still finds a shield', () => {
		const result = computeTaxShield({
			mortgageInterest: 27386,
			propertyTax: 4592,
			stateIncomeTax: 30000,
			charitable: 0,
			magi: 560000,
			filingStatus: 'joint'
		});
		expect(result.saltPhasedDown).toBe(true);
		expect(result.saltUsed).toBeCloseTo(23900, 0);
		expect(result.shield).toBeCloseTo(4581, 0);
	});

	it('returns zero rather than a negative shield when the standard deduction wins', () => {
		const result = computeTaxShield({
			mortgageInterest: 6000,
			propertyTax: 1800,
			stateIncomeTax: 2000,
			charitable: 0,
			magi: 70000,
			filingStatus: 'single'
		});
		expect(result.excess).toBe(0);
		expect(result.shield).toBe(0);
	});

	it('caps deductible interest at the $750,000 acquisition-debt ceiling', () => {
		const interest = deductibleInterestFor(1000000, 0.0732);
		expect(interest).toBeCloseTo(750000 * 0.0732, 2);
		expect(deductibleInterestFor(400000, 0.0732)).toBeCloseTo(400000 * 0.0732, 2);
	});
});
