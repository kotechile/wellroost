/**
 * Time-of-use and EV load arbitrage.
 *
 * The comparison is between two tariffs for the same household, not between two rates. A time-of-use
 * schedule makes overnight charging very cheap and dinner-hour load very expensive, so whether it
 * pays depends on the shape of the household's day: how much of its load sits in the peak window, how
 * much of that can move, and how much of the car's charging lands in the super-off-peak hours.
 *
 * Two implementation rules come straight out of a review of an earlier draft of this model, and both
 * are asserted in the tests:
 *
 * 1. **The energy shares sum to exactly one.** Redistributing a shiftable share out of peak must not
 *    create energy: off-peak is `1 − peak − superOffPeak`, not a fixed coefficient plus the shift.
 *    The draft overcounted by β, which understated a real saving by 63% at its own defaults.
 * 2. **The break-even peak share is the inverse of the cost function.** It is solved by bisection
 *    against the same function the table uses, not by a hand-derived closed form that drifts from it.
 *    The draft published 46.4% where its own model crossed at 61.2%, which flips the verdict for a
 *    household sitting in between.
 */
export interface TouInputs {
	monthlyKwh: number;
	evMilesPerDay: number;
	evMilesPerKwh: number;
	flatRate: number;
	peakRate: number;
	offPeakRate: number;
	superOffPeakRate: number;
	/** Share of base household load that lands in the peak window today. */
	peakShare: number;
	/** Share of base load that can be moved out of the peak window. */
	shiftableShare: number;
	/** Share of EV charging done in the super-off-peak window. */
	evSuperOffPeakShare: number;
	/** Optional demand charge, in dollars per kW of peak demand per month. */
	demandCharge: { peakKw: number; perKw: number };
}

export interface TouResult {
	evKwh: number;
	homeKwh: number;
	flatCost: number;
	touCost: number;
	savings: number;
	/** The peak share at which the switch stops paying, solved numerically. */
	breakEvenPeakShare: number | null;
	shares: { peak: number; offPeak: number; superOffPeak: number };
	demandCost: number;
	verdict: 'switch' | 'conditional' | 'stay';
}

const evAnnualKwh = (input: TouInputs) =>
	input.evMilesPerKwh > 0 ? (Math.max(0, input.evMilesPerDay) / input.evMilesPerKwh) * 365 : 0;

function touCostAt(input: TouInputs, peakShare: number): number {
	const homeKwh = Math.max(0, input.monthlyKwh) * 12;
	const evKwh = evAnnualKwh(input);

	const shift = Math.min(Math.max(0, input.shiftableShare), Math.max(0, peakShare - 0.05));
	const peak = Math.max(0.05, peakShare - shift);
	const superOffPeak = Math.min(1 - peak, 0.35 + 0.5 * shift);
	const offPeak = Math.max(0, 1 - peak - superOffPeak);

	const home = homeKwh * (peak * input.peakRate + offPeak * input.offPeakRate + superOffPeak * input.superOffPeakRate);
	const evShare = Math.min(1, Math.max(0, input.evSuperOffPeakShare));
	const ev = evKwh * (evShare * input.superOffPeakRate + (1 - evShare) * input.offPeakRate);
	const demand = Math.max(0, input.demandCharge.peakKw) * Math.max(0, input.demandCharge.perKw) * 12;
	return home + ev + demand;
}

function flatCostOf(input: TouInputs): number {
	const homeKwh = Math.max(0, input.monthlyKwh) * 12;
	return (homeKwh + evAnnualKwh(input)) * Math.max(0, input.flatRate);
}

export function runTou(input: TouInputs): TouResult {
	const homeKwh = Math.max(0, input.monthlyKwh) * 12;
	const evKwh = evAnnualKwh(input);
	const flat = flatCostOf(input);
	const tou = touCostAt(input, input.peakShare);

	const shift = Math.min(Math.max(0, input.shiftableShare), Math.max(0, input.peakShare - 0.05));
	const peak = Math.max(0.05, input.peakShare - shift);
	const superOffPeak = Math.min(1 - peak, 0.35 + 0.5 * shift);
	const offPeak = Math.max(0, 1 - peak - superOffPeak);

	// Solve for the crossing on the same function the table uses. If the household never crosses,
	// there is no ceiling to report and the page says so instead of inventing one.
	let breakEven: number | null = null;
	if (touCostAt(input, 0.05) > flat) {
		breakEven = null;
	} else if (touCostAt(input, 0.95) < flat) {
		breakEven = null;
	} else {
		let low = 0.05;
		let high = 0.95;
		for (let step = 0; step < 200; step += 1) {
			const mid = (low + high) / 2;
			if (touCostAt(input, mid) < flat) low = mid;
			else high = mid;
		}
		breakEven = (low + high) / 2;
	}

	const savings = flat - tou;
	const verdict: TouResult['verdict'] =
		savings < 0 ? 'stay' : savings >= 250 && (breakEven === null || input.peakShare <= breakEven - 0.05) ? 'switch' : 'conditional';

	return {
		evKwh,
		homeKwh,
		flatCost: flat,
		touCost: tou,
		savings,
		breakEvenPeakShare: breakEven,
		shares: { peak, offPeak, superOffPeak },
		demandCost: Math.max(0, input.demandCharge.peakKw) * Math.max(0, input.demandCharge.perKw) * 12,
		verdict
	};
}

/** Savings at a hypothetical peak share, used by the page's ladder and by the break-even assertion. */
export function savingsAt(input: TouInputs, peakShare: number): number {
	return flatCostOf(input) - touCostAt(input, peakShare);
}
