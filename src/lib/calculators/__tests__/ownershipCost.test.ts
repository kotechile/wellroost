import { describe, expect, it } from 'vitest';
import { runOwnershipCost, type OwnershipCostInputs } from '../ownershipCost';
import { defaultComponents } from '../sinkingFund';

const base: OwnershipCostInputs = {
	price: 650000,
	downPaymentShare: 0.2,
	rate: 0.0732,
	termMonths: 360,
	jurisdictionId: 'ca',
	effectiveTaxRate: 0.0112,
	insuranceAnnual: 3057,
	floodAnnual: 0,
	hoaMonthly: 0,
	hoaReserveFunding: 1,
	components: defaultComponents()
};

describe('ownershipCost', () => {
	it('charges California property tax on the purchase price, not the seller basis', () => {
		const result = runOwnershipCost(base);
		expect(result.modelable).toBe(true);
		expect(result.taxYear1).toBeCloseTo(650000 * 0.0112, 2);
	});

	it('shows the step-up an acquisition-value state creates on sale', () => {
		const result = runOwnershipCost(base);
		expect(result.sellerTaxAnnual).toBeLessThan(result.taxYear1);
		expect(result.taxStepUp).toBeGreaterThan(2000);
	});

	it('refuses to model a jurisdiction it does not carry', () => {
		const result = runOwnershipCost({ ...base, jurisdictionId: 'zz' });
		expect(result.modelable).toBe(false);
		expect(result.coverage.length).toBeGreaterThan(5);
		expect(result.monthly).toBe(0);
	});

	it('adds a special assessment when the reserve study is thin', () => {
		const healthy = runOwnershipCost({ ...base, hoaMonthly: 350, hoaReserveFunding: 0.95 });
		const thin = runOwnershipCost({ ...base, hoaMonthly: 350, hoaReserveFunding: 0.3 });
		expect(healthy.rows.some((row) => row.id === 'assessment')).toBe(false);
		expect(thin.rows.some((row) => row.id === 'assessment')).toBe(true);
		expect(thin.monthly).toBeGreaterThan(healthy.monthly);
	});

	it('keeps the non-debt share visible on a high-rate loan in a high-tax state', () => {
		const result = runOwnershipCost(base);
		expect(result.nonDebtShare).toBeGreaterThan(0.2);
		expect(result.nonDebtShare).toBeLessThan(0.5);
		expect(result.projection).toHaveLength(3);
		expect(result.projection[2].monthly).toBeGreaterThan(result.projection[0].monthly);
	});
});
