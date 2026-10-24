import { describe, expect, it } from 'vitest';
import { runTou, savingsAt, type TouInputs } from '../touArbitrage';

const base: TouInputs = {
	monthlyKwh: 950,
	evMilesPerDay: 35,
	evMilesPerKwh: 3.1,
	flatRate: 0.185,
	peakRate: 0.34,
	offPeakRate: 0.165,
	superOffPeakRate: 0.085,
	peakShare: 0.32,
	shiftableShare: 0.12,
	evSuperOffPeakShare: 0.9,
	demandCharge: { peakKw: 0, perKw: 0 }
};

describe('touArbitrage', () => {
	it('allocates exactly one unit of household energy', () => {
		const result = runTou(base);
		const sum = result.shares.peak + result.shares.offPeak + result.shares.superOffPeak;
		expect(sum).toBeCloseTo(1, 9);
	});

	it('holds the identity across a sweep of shiftable shares', () => {
		for (const shiftableShare of [0, 0.05, 0.12, 0.2, 0.3, 0.6]) {
			const result = runTou({ ...base, shiftableShare });
			const sum = result.shares.peak + result.shares.offPeak + result.shares.superOffPeak;
			expect(sum).toBeCloseTo(1, 9);
		}
	});

	it('prices the switch at about 582 a year on the reference household', () => {
		const result = runTou(base);
		// An earlier draft of this model misallocated the shifted share and reported 356 for the same
		// inputs. The corrected figure is 582; the test pins it so the bug cannot come back.
		expect(result.flatCost).toBeCloseTo(2871.38, 1);
		expect(result.savings).toBeCloseTo(582.05, 0);
		expect(result.verdict).toBe('switch');
	});

	it('solves the break-even peak share by inverting its own cost function', () => {
		const result = runTou(base);
		expect(result.breakEvenPeakShare).not.toBeNull();
		expect(result.breakEvenPeakShare ?? 0).toBeCloseTo(0.6118, 3);
		// And the published break-even really is the crossing: savings there are zero.
		expect(Math.abs(savingsAt(base, result.breakEvenPeakShare ?? 0))).toBeLessThan(0.5);
	});

	it('says stay when the household sits above the ceiling', () => {
		const result = runTou({ ...base, peakShare: 0.72 });
		expect(result.savings).toBeLessThan(0);
		expect(result.verdict).toBe('stay');
	});

	it('adds a demand charge to the time-of-use side only', () => {
		const withDemand = runTou({ ...base, demandCharge: { peakKw: 6, perKw: 4 } });
		expect(withDemand.demandCost).toBeCloseTo(288, 2);
		expect(withDemand.savings).toBeLessThan(runTou(base).savings);
	});

	it('carries EV miles into the annual energy', () => {
		const result = runTou(base);
		expect(result.evKwh).toBeCloseTo((35 / 3.1) * 365, 2);
		expect(result.homeKwh).toBeCloseTo(11400, 2);
	});
});
