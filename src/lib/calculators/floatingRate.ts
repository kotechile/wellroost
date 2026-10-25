/**
 * Floating-rate stress test: HELOC and ARM.
 *
 * The point of this engine is not the payment at the current rate — the statement already prints
 * that. It is the payment at the *next* four steps, subject to the caps the contract actually
 * contains, plus the single number a household can act on: how much rate movement exhausts a monthly
 * cushion before it has to be found somewhere else.
 *
 * Two honesty rules are built into the shape of the result:
 *
 * - A step above the lifetime ceiling is not projected. It is reported as blocked, with the ceiling
 *   named. Projecting a rate the contract forbids would be a scarier number and a wrong one.
 * - The multi-month figure is "additional cash", not "additional interest". During a HELOC draw the
 *   two are identical (interest-only), but on an amortizing balance the extra cash also retires a
 *   little more principal, so calling it interest would overstate the cost.
 */
import { calculateMonthlyPayment } from './amortization';

export type FloatingProduct = 'heloc-draw' | 'heloc-repay' | 'arm';

export interface FloatingRateInputs {
	product: FloatingProduct;
	balance: number;
	currentRate: number;
	/** Rate at which the balance stops repricing. Absolute, e.g. 0.18 for an 18% HELOC ceiling. */
	lifetimeCapRate: number;
	/** Largest single adjustment the contract permits, e.g. 0.02. */
	periodicCap: number;
	monthsToReset: number;
	/** Amortization period for the repayment phase, or the remaining term of an ARM. */
	amortizeMonths: number;
	/** Monthly cash the household can absorb before the payment becomes a problem. */
	monthlyCushion: number;
}

export interface RateStep {
	bps: number;
	rate: number;
	/** True when the step is beyond the next adjustment but inside the lifetime ceiling. */
	beyondNextAdjustment: boolean;
	/** True when the step exceeds the lifetime ceiling and is therefore not projected. */
	blocked: boolean;
	payment: number;
	deltaPayment: number;
	repaymentPayment: number;
	extraCash12: number;
	extraCash36: number;
}

export interface FloatingRateResult {
	currentPayment: number;
	/** Interest-only figure for the draw phase; equal to the payment there. */
	interestOnlyPayment: number;
	amortizingPayment: number;
	steps: RateStep[];
	lifetimeCapRate: number;
	lifetimeCapPayment: number;
	/** Basis points of movement before the cushion is gone. */
	cushionBps: number | null;
	/** Months until the cushion is gone at the next scheduled adjustment. */
	cushionMonths: number | null;
	nextAdjustment: { rate: number; payment: number; deltaPayment: number };
	verdict: 'stable' | 'watch' | 'exposed';
}

const STEPS = [25, 50, 100, 200];

function paymentAt(input: FloatingRateInputs, rate: number): number {
	if (input.product === 'heloc-draw') return (Math.max(0, input.balance) * rate) / 12;
	return calculateMonthlyPayment(Math.max(0, input.balance), rate, Math.max(1, input.amortizeMonths));
}

export function runFloatingRate(input: FloatingRateInputs): FloatingRateResult {
	const balance = Math.max(0, input.balance);
	const currentPayment = paymentAt(input, input.currentRate);
	const interestOnlyPayment = (balance * input.currentRate) / 12;
	const amortizingPayment = calculateMonthlyPayment(balance, input.currentRate, Math.max(1, input.amortizeMonths));

	const steps: RateStep[] = STEPS.map((bps) => {
		const rate = input.currentRate + bps / 10000;
		const blocked = rate > input.lifetimeCapRate;
		const payment = blocked ? currentPayment : paymentAt(input, rate);
		const deltaPayment = blocked ? 0 : payment - currentPayment;
		const repaymentPayment = blocked
			? calculateMonthlyPayment(balance, input.currentRate, Math.max(1, input.amortizeMonths))
			: calculateMonthlyPayment(balance, rate, Math.max(1, input.amortizeMonths));
		return {
			bps,
			rate,
			beyondNextAdjustment: bps / 10000 > input.periodicCap,
			blocked,
			payment,
			deltaPayment,
			repaymentPayment,
			extraCash12: deltaPayment * 12,
			extraCash36: deltaPayment * 36
		};
	});

	const lifetimeCapPayment = paymentAt(input, input.lifetimeCapRate);

	// The cushion solve is done on the payment function, not on a closed form, so an amortizing
	// balance and an interest-only line give answers that match the table above them.
	let cushionBps: number | null = null;
	if (input.monthlyCushion > 0) {
		for (let bps = 1; bps <= 2000; bps += 1) {
			const rate = Math.min(input.currentRate + bps / 10000, input.lifetimeCapRate);
			if (paymentAt(input, rate) - currentPayment >= input.monthlyCushion) {
				cushionBps = bps;
				break;
			}
			if (rate >= input.lifetimeCapRate) break;
		}
	}

	const nextRate = Math.min(input.currentRate + input.periodicCap, input.lifetimeCapRate);
	const nextPayment = paymentAt(input, nextRate);
	const nextDelta = nextPayment - currentPayment;

	const cushionMonths = cushionBps !== null ? input.monthsToReset : null;
	// The verdict counts resets, not basis points: a household does not experience 137 bps, it
	// experiences the payment that arrives after the next scheduled adjustment.
	const periodicBps = Math.max(1, Math.round(input.periodicCap * 10000));
	const verdict: FloatingRateResult['verdict'] =
		cushionBps === null || cushionBps > periodicBps * 2
			? 'stable'
			: cushionBps > periodicBps
				? 'watch'
				: 'exposed';

	return {
		currentPayment,
		interestOnlyPayment,
		amortizingPayment,
		steps,
		lifetimeCapRate: input.lifetimeCapRate,
		lifetimeCapPayment,
		cushionBps,
		cushionMonths,
		nextAdjustment: { rate: nextRate, payment: nextPayment, deltaPayment: nextDelta },
		verdict
	};
}
