import { describe, expect, it } from 'vitest';
import { runDownPayment, type DownPaymentInputs } from '../downPayment';

const base: DownPaymentInputs = {
	price: 400000,
	rate: 0.0732,
	termMonths: 360,
	tiers: [0.03, 0.1, 0.2],
	closingCostShare: 0.02,
	reserveTarget: 25000,
	assistance: { amount: 15000, rateSurcharge: 0.0025, forgiven: true },
	yearsToHold: 7
};

describe('downPayment', () => {
	it('charges no mortgage insurance at 20% down', () => {
		const result = runDownPayment(base);
		const twenty = result.tiers.find((tier) => tier.downShare === 0.2);
		expect(twenty?.miRate).toBe(0);
		expect(twenty?.monthlyMi).toBe(0);
		expect(twenty?.cumulativeMiOverHold).toBe(0);
	});

	it('prices a 3% down loan at 1.1% a year of the balance', () => {
		const result = runDownPayment(base);
		const three = result.tiers.find((tier) => tier.downShare === 0.03);
		expect(three?.loan).toBeCloseTo(388000, 2);
		expect(three?.monthlyMi).toBeCloseTo((388000 * 0.011) / 12, 2);
	});

	it('finds the month the premium cancels itself', () => {
		const result = runDownPayment(base);
		const ten = result.tiers.find((tier) => tier.downShare === 0.1);
		expect(ten?.cancellationMonth).not.toBeNull();
		expect(ten?.cancellationMonth ?? 0).toBeGreaterThan(12);
		expect(ten?.terminationMonth ?? 0).toBeGreaterThan(ten?.cancellationMonth ?? 0);
	});

	it('trades cash for premium, which is the whole decision', () => {
		const result = runDownPayment(base);
		const three = result.tiers.find((tier) => tier.downShare === 0.03);
		const twenty = result.tiers.find((tier) => tier.downShare === 0.2);
		expect(three!.cashLeftAfterClosing).toBeGreaterThan(twenty!.cashLeftAfterClosing);
		expect(three!.paymentWithMi).toBeGreaterThan(twenty!.paymentWithMi);
	});

	it('recommends the cheapest tier that clears the reserve target', () => {
		const result = runDownPayment(base);
		expect(result.recommended).toBeGreaterThan(0);
		const tier = result.tiers.find((entry) => entry.downShare === result.recommended);
		expect(tier?.meetsReserveTarget).toBe(true);
	});

	it('prices the assistance surcharge against the assistance', () => {
		const result = runDownPayment(base);
		expect(result.assistance.costOfSurcharge).toBeGreaterThan(0);
		expect(result.assistance.netBenefit).toBeCloseTo(15000 - result.assistance.costOfSurcharge, 2);
	});

	it('declines assistance whose surcharge outruns the grant', () => {
		const result = runDownPayment({
			...base,
			assistance: { amount: 2000, rateSurcharge: 0.01, forgiven: false }
		});
		expect(result.assistance.verdict).toBe('decline');
	});
});
