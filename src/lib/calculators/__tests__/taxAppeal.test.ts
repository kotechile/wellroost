import { describe, expect, it } from 'vitest';
import { currentTax, runTaxAppeal, type TaxAppealInputs } from '../taxAppeal';

const base: TaxAppealInputs = {
	jurisdictionId: 'ga',
	assessedValue: 100000,
	effectiveRate: 0.01,
	subject: { sqft: 2200, beds: 4, baths: 3, garage: 2 },
	comps: [
		{ price: 215000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 3 },
		{ price: 225000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 5 },
		{ price: 220000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 4 }
	],
	filingFee: 0,
	contingencyShare: 0,
	discountRate: 0.04,
	years: 5
};

describe('taxAppeal', () => {
	it('converts an assessed value into the market value the county asserts', () => {
		const result = runTaxAppeal(base);
		// Georgia assesses at 40%: $100,000 on the roll is a claim that the house is worth $250,000.
		expect(result.impliedValue).toBeCloseTo(250000, 2);
	});

	it('finds the excess against comps and calls it fileable at 10% or more', () => {
		const result = runTaxAppeal(base);
		expect(result.medianAdjusted).toBeCloseTo(220000, 2);
		expect(result.excess).toBeCloseTo(30000, 2);
		expect(result.varianceShare).toBeCloseTo(0.12, 4);
		expect(result.verdict).toBe('file');
	});

	it('prices the reduction as an annual tax delta', () => {
		const result = runTaxAppeal(base);
		expect(result.annualDelta).toBeCloseTo(30000 * 0.01, 2);
		expect(result.npv).toBeGreaterThan(result.annualDelta);
	});

	it('adjusts a comp upward when the subject is larger', () => {
		const result = runTaxAppeal({
			...base,
			comps: base.comps.map((comp) => ({ ...comp, sqft: 2000 }))
		});
		expect(result.adjustments[0].sqftAdjustment).toBeGreaterThan(0);
		// The per-square-foot rate comes from the evidence supplied, so shrinking the comps shrinks
		// the rate with them: three sales at $215k–$225k over 2,000 sqft price at $107.50–$112.50.
		expect(result.compPricePerSqft).toBeCloseTo(110, 2);
	});

	it('refuses to rule on fewer than three comps', () => {
		const result = runTaxAppeal({ ...base, comps: base.comps.slice(0, 2) });
		expect(result.verdict).toBe('insufficient');
	});

	it('refuses an unmodelled jurisdiction', () => {
		const result = runTaxAppeal({ ...base, jurisdictionId: 'zz' });
		expect(result.modelable).toBe(false);
		expect(result.coverage.length).toBeGreaterThan(5);
	});

	it('reports the tax the roll currently produces', () => {
		const result = runTaxAppeal(base);
		expect(currentTax(base, result)).toBeCloseTo(250000 * 0.01, 2);
	});
});
