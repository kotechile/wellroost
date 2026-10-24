import { describe, expect, it } from 'vitest';
import { runPermitRisk, type PermitInputs } from '../permitRisk';

const base: PermitInputs = {
	sqft: 480,
	permitFee: 1200,
	plansCost: 2500,
	penaltyMultiplier: 2,
	engineerLetter: 900,
	destructiveExposure: 2400,
	codeFailProbability: 0.35,
	remediationCost: 6000,
	valuePerSqft: 210,
	appraisalHaircut: 0.75,
	buyerConcession: 5000,
	assessedIncrease: 18000,
	effectiveRate: 0.011,
	stayYears: 7,
	discountRate: 0.04
};

describe('permitRisk', () => {
	it('prices the three paths and names one', () => {
		const result = runPermitRisk(base);
		expect(result.paths).toHaveLength(3);
		expect(['permit', 'retro', 'as-is']).toContain(result.cheapest);
	});

	it('charges the penalty multiple on the base fee for regularising later', () => {
		const result = runPermitRisk(base);
		const retro = result.paths.find((path) => path.id === 'retro');
		expect(retro?.upfront).toBeCloseTo(2400 + 900, 2);
	});

	it('excludes the unpermitted area at resale', () => {
		const result = runPermitRisk(base);
		const asIs = result.paths.find((path) => path.id === 'as-is');
		expect(asIs?.contingent).toBeCloseTo(480 * 210 * 0.75 + 5000, 2);
	});

	it('counts the tax the permitted work adds while the household stays', () => {
		const result = runPermitRisk(base);
		const permit = result.paths.find((path) => path.id === 'permit');
		expect(permit?.taxOverStay).toBeGreaterThan(0);
		expect(permit?.total).toBeGreaterThan(permit?.upfront ?? 0);
	});

	it('reports the largest single exposure, which is what a buyer inherits', () => {
		const result = runPermitRisk(base);
		const max = Math.max(...result.paths.map((path) => path.total));
		expect(result.maxExposure).toBe(max);
	});

	it('makes an as-is sale cheaper than a permit when the haircut is small', () => {
		const cheap = runPermitRisk({ ...base, appraisalHaircut: 0, buyerConcession: 0, sqft: 40 });
		expect(cheap.cheapest).toBe('as-is');
	});
});
