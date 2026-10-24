import { describe, expect, it } from 'vitest';
import { runInsuranceGap, type InsuranceGapInputs } from '../insuranceGap';

const base: InsuranceGapInputs = {
	coverageA: 500000,
	flatDeductible: 2500,
	perilDeductibles: { wind: 0.02, hail: 0.02, namedStorm: 0.05, hurricane: 0.05 },
	roofMaterial: 'asphalt-3tab',
	roofAge: 15,
	roofReplacementCost: 22000,
	settlement: 'acv',
	claimOpen: true,
	monthsSinceClaim: 3
};

describe('insuranceGap', () => {
	it('turns a 5% named-storm deductible into 25,000 on a 500,000 dwelling limit', () => {
		const result = runInsuranceGap(base);
		const storm = result.perils.find((peril) => peril.id === 'namedStorm');
		expect(storm?.dollars).toBe(25000);
		expect(result.maxPeril.dollars).toBe(25000);
	});

	it('withholds 75% of a roof at 15 of 20 years on an actual-cash-value settlement', () => {
		const result = runInsuranceGap(base);
		expect(result.depreciation.ratio).toBeCloseTo(0.75, 6);
		expect(result.depreciation.withheld).toBeCloseTo(16500, 2);
		expect(result.depreciation.paysOut).toBeCloseTo(5500, 2);
	});

	it('keeps the full replacement cost on a replacement-cost settlement', () => {
		const result = runInsuranceGap({ ...base, settlement: 'rcv' });
		expect(result.depreciation.withheld).toBe(0);
		expect(result.depreciation.paysOut).toBe(22000);
	});

	it('reports one liquid figure for the worst day', () => {
		const result = runInsuranceGap(base);
		expect(result.liquidExposure).toBeCloseTo(25000 + 16500, 2);
		expect(result.verdict).toBe('deductible-dominated');
	});

	it('flags the depreciation gap when it outweighs the deductible', () => {
		const result = runInsuranceGap({ ...base, roofReplacementCost: 60000, roofAge: 20 });
		expect(result.verdict).toBe('gap-dominated');
	});

	it('counts down the depreciation recovery window', () => {
		expect(runInsuranceGap(base).recoveryMonthsLeft).toBe(9);
		expect(runInsuranceGap({ ...base, monthsSinceClaim: 14 }).recoveryMonthsLeft).toBe(0);
		expect(runInsuranceGap({ ...base, claimOpen: false }).recoveryMonthsLeft).toBeNull();
	});
});
