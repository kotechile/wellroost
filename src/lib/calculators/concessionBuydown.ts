/**
 * Seller concession: one credit, three destinations.
 *
 * A $20,000 concession can reduce the price, buy permanent discount points, or fund a 2-1 temporary
 * buydown. The three are not interchangeable, and the difference is not the monthly payment — it is
 * what happens when the buyer refinances or sells.
 *
 * - A price cut lowers the loan *and* the tax basis, permanently.
 * - Permanent points lower the rate forever, and are gone the day the loan is refinanced.
 * - A 2-1 buydown parks cash in a custodial account and spends it over 24 months. On payoff, Fannie
 *   Mae's servicing guide credits what is left against the payoff amount — *or* returns it to the
 *   party who funded it, depending on the agreement. That is why the credit is a toggle here rather
 *   than an assumption: the agreement decides, and the buyer should read it before signing.
 *
 * Two constraints the arithmetic has to respect. A 2-1 plan has a fixed cost, so a credit larger than
 * that cost leaves a remainder that has to go somewhere. And points do not buy a linear rate
 * reduction: the first two points are worth roughly 25 basis points each, and the curve flattens
 * after that, so the engine discounts deeper buydowns instead of pretending they scale.
 */
import { calculateMonthlyPayment } from './amortization';

export interface ConcessionInputs {
	price: number;
	downShare: number;
	noteRate: number;
	credit: number;
	/** Months the buyer expects to hold the loan before refinancing or selling. */
	holdMonths: number;
	/** True when the buydown agreement credits unused funds to the payoff. */
	refiCreditsPayoff: boolean;
	/** Basis points bought by the first point. */
	bpsPerPoint: number;
	/** Effective property tax rate, for the basis change on a price cut. */
	effectiveTaxRate: number;
}

export interface ConcessionPath {
	id: 'price-cut' | 'points' | 'buydown';
	label: string;
	loan: number;
	/** Year-one monthly principal and interest. */
	payment: number;
	/** Rate that applies in year three and after. */
	steadyRate: number;
	/** Cash committed over the hold period. */
	cashOverHold: number;
	/** Property tax over the hold period. */
	taxOverHold: number;
	/** Credit that survives a payoff, if any. */
	payoffCredit: number;
	/** True when the path spends money the buyer cannot recover. */
	sunk: boolean;
	note: string;
}

export interface ConcessionResult {
	paths: {
		priceCut: ConcessionPath;
		points: ConcessionPath;
		buydown: ConcessionPath & {
			escrowCost: number;
			excessCredit: number;
			shortfall: number;
			yearOne: number;
			yearTwo: number;
			/** Payment from year three, back at the note rate. */
			yearThree: number;
			payoffCreditAt: { months12: number; months18: number; months24: number };
		};
	};
	best: 'price-cut' | 'points' | 'buydown';
	netCost: { priceCut: number; points: number; buydown: number };
	pointsRateFloor: number;
}

/** Rate reduction from a given number of points, with a flattening curve past two points. */
export function rateReduction(points: number, bpsPerPoint: number): number {
	const firstTwo = Math.min(points, 2) * (bpsPerPoint / 10000);
	const beyond = Math.max(0, points - 2) * (bpsPerPoint / 20000);
	return Math.min(0.02, firstTwo + beyond);
}

export function runConcession(input: ConcessionInputs): ConcessionResult {
	const price = Math.max(0, input.price);
	const credit = Math.max(0, input.credit);
	const down = Math.min(1, Math.max(0, input.downShare));
	const hold = Math.max(1, Math.round(input.holdMonths));
	const taxRate = Math.max(0, input.effectiveTaxRate);

	/* Path A — price cut */
	const cutPrice = Math.max(0, price - credit);
	const cutLoan = cutPrice * (1 - down);
	const cutPayment = calculateMonthlyPayment(cutLoan, input.noteRate, 360);
	const cutTaxAnnual = cutPrice * taxRate;
	const taxOnOriginal = price * taxRate;
	const cutTaxOverHold = sumGrowing(cutTaxAnnual, 0.04, hold / 12);
	const originalTaxOverHold = sumGrowing(taxOnOriginal, 0.04, hold / 12);

	/* Path B — permanent points on the original loan */
	const baseLoan = price * (1 - down);
	const points = baseLoan > 0 ? (credit / baseLoan) * 100 : 0;
	const reduction = rateReduction(points, input.bpsPerPoint);
	const pointsRate = Math.max(0.005, input.noteRate - reduction);
	const pointsPayment = calculateMonthlyPayment(baseLoan, pointsRate, 360);

	/* Path C — 2-1 temporary buydown */
	const fullPayment = calculateMonthlyPayment(baseLoan, input.noteRate, 360);
	const year1Subsidy = fullPayment - calculateMonthlyPayment(baseLoan, input.noteRate - 0.02, 360);
	const year2Subsidy = fullPayment - calculateMonthlyPayment(baseLoan, input.noteRate - 0.01, 360);
	const escrowCost = year1Subsidy * 12 + year2Subsidy * 12;
	const excessCredit = Math.max(0, credit - escrowCost);
	const shortfall = Math.max(0, escrowCost - credit);
	const fundedCredit = Math.min(credit, escrowCost);

	const buydownYearOne = calculateMonthlyPayment(baseLoan, input.noteRate - 0.02, 360);
	const buydownYearTwo = calculateMonthlyPayment(baseLoan, input.noteRate - 0.01, 360);

	const monthsInYear1 = Math.min(hold, 12);
	const monthsInYear2 = Math.min(Math.max(hold - 12, 0), 12);
	const monthsAtFull = Math.max(hold - 24, 0);
	const buydownCash = buydownYearOne * monthsInYear1 + buydownYearTwo * monthsInYear2 + fullPayment * monthsAtFull;

	const payoffCreditAt = (month: number) => {
		if (!input.refiCreditsPayoff) return 0;
		const used1 = Math.min(month, 12);
		const used2 = Math.min(Math.max(month - 12, 0), 12);
		const remaining = year1Subsidy * (12 - used1) + year2Subsidy * (12 - used2);
		return Math.max(0, Math.min(remaining, fundedCredit));
	};

	const payoffCredit = payoffCreditAt(hold);

	const paths = {
		priceCut: {
			id: 'price-cut' as const,
			label: 'Price reduction',
			loan: cutLoan,
			payment: cutPayment,
			steadyRate: input.noteRate,
			cashOverHold: cutPayment * hold,
			taxOverHold: cutTaxOverHold,
			payoffCredit: 0,
			sunk: false,
			note: 'The loan shrinks, and so does the assessment the county just reset to your purchase price.'
		},
		points: {
			id: 'points' as const,
			label: 'Permanent points',
			loan: baseLoan,
			payment: pointsPayment,
			steadyRate: pointsRate,
			cashOverHold: pointsPayment * hold,
			taxOverHold: originalTaxOverHold,
			payoffCredit: 0,
			sunk: hold < 360,
			note: `${points.toFixed(2)} points buy the rate down to ${(pointsRate * 100).toFixed(3)}%. Nothing comes back if the loan is refinanced.`
		},
		buydown: {
			id: 'buydown' as const,
			label: '2-1 buydown',
			loan: baseLoan,
			payment: buydownYearOne,
			steadyRate: input.noteRate,
			cashOverHold: buydownCash,
			taxOverHold: originalTaxOverHold,
			payoffCredit,
			sunk: false,
			note: `The escrow needs ${escrowCost.toFixed(0)} to fund two years of subsidy. ${
				excessCredit > 0
					? `${excessCredit.toFixed(0)} of the credit is left over and has to go somewhere.`
					: shortfall > 0
						? `The credit is ${shortfall.toFixed(0)} short of funding the plan.`
						: 'The credit funds it exactly.'
			}`,
			escrowCost,
			excessCredit,
			shortfall,
			yearOne: buydownYearOne,
			yearTwo: buydownYearTwo,
			yearThree: fullPayment,
			payoffCreditAt: {
				months12: payoffCreditAt(12),
				months18: payoffCreditAt(18),
				months24: payoffCreditAt(24)
			}
		}
	};

	const netCost = {
		priceCut: paths.priceCut.cashOverHold + paths.priceCut.taxOverHold,
		points: paths.points.cashOverHold + paths.points.taxOverHold - (paths.points.sunk ? 0 : 0),
		buydown: paths.buydown.cashOverHold + paths.buydown.taxOverHold - paths.buydown.payoffCredit
	};

	const best = (
		[
			{ id: 'price-cut' as const, cost: netCost.priceCut },
			{ id: 'points' as const, cost: netCost.points },
			{ id: 'buydown' as const, cost: netCost.buydown }
		].sort((a, b) => a.cost - b.cost)
	)[0].id;

	return { paths, best, netCost, pointsRateFloor: reduction };
}

/** Sum of a growing annual amount over `years`, which may be fractional. */
function sumGrowing(annual: number, growth: number, years: number): number {
	const full = Math.floor(years);
	let total = 0;
	for (let year = 0; year < full; year += 1) total += annual * Math.pow(1 + growth, year);
	const remainder = years - full;
	if (remainder > 0) total += annual * Math.pow(1 + growth, full) * remainder;
	return total;
}
