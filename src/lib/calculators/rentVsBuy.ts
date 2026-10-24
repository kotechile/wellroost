/**
 * Rent vs buy, on outflow parity.
 *
 * Most rent-vs-buy calculators compare nominal monthly payments and conclude that owning is cheaper
 * because a mortgage payment is bigger than a rent cheque in year one and smaller in year ten. That
 * comparison is not a comparison: it ignores the capital the buyer had to commit up front, and it
 * ignores that a renter who spends less each month can invest the difference.
 *
 * So both paths start with the same liquid capital. The buyer spends it on the down payment and
 * closing costs; the renter invests an identical sum. Every month the cheaper path invests the
 * difference. The answer is the year the two portfolios cross — not the month a payment crosses.
 *
 * The tax shield is modelled, not assumed away. At the 2026 SALT cap the shield is real money for a
 * median-price buyer, and leaving it out pushes every answer against buying.
 */
import { calculateMonthlyPayment, calculateProspectiveBalance, interestPaid } from './amortization';
import { computeTaxShield } from './taxShield';

export interface RentVsBuyInputs {
	price: number;
	downShare: number;
	rate: number;
	termMonths: number;
	/** Buyer closing costs, as a share of price. */
	buyClosingShare: number;
	rentMonthly: number;
	rentGrowth: number;
	appreciation: number;
	investReturn: number;
	/** Round-trip cost of selling at the end: commission, transfer taxes, concessions. */
	sellFriction: number;
	/** Maintenance and repairs, as a share of price a year. */
	maintenanceShare: number;
	insuranceAnnual: number;
	/** Effective property tax rate against market value. */
	taxRate: number;
	magi: number;
	filingStatus: 'single' | 'joint';
	stateIncomeTax: number;
	horizonYears: number;
}

export interface ParityYear {
	year: number;
	ownerWealth: number;
	renterWealth: number;
	/** Renter minus owner. Positive means renting is ahead. */
	gap: number;
	ownerOutflow: number;
	rent: number;
	shield: number;
	balance: number;
	homeValue: number;
}

export interface RentVsBuyResult {
	series: ParityYear[];
	breakEvenYear: number | null;
	terminal: { year: number; owner: number; renter: number }[];
	upfront: { buyer: number; renter: number };
	yearOneOutflow: { owner: number; rent: number };
	lifetimeShield: number;
	sensitivity: Array<{ appreciation: number; investReturn: number; breakEvenYear: number | null }>;
}

const yearly = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

function simulate(
	input: RentVsBuyInputs,
	appreciation: number,
	investReturn: number
): { series: ParityYear[]; lifetimeShield: number } {
	const price = Math.max(0, input.price);
	const down = price * Math.min(1, Math.max(0, input.downShare));
	const upfront = down + price * Math.max(0, input.buyClosingShare);
	const loan = Math.max(0, price - down);
	const payment = calculateMonthlyPayment(loan, input.rate, Math.max(1, input.termMonths));

	const monthlyReturn = yearly(Math.max(0, investReturn));
	const monthlyGrowth = yearly(Math.max(0, input.rentGrowth));

	// Both paths hold the same cash at t=0. The renter's portfolio starts with the buyer's entire
	// up-front commitment, which is the money the buyer no longer has.
	let ownerPortfolio = 0;
	let renterPortfolio = upfront;

	const series: ParityYear[] = [];
	let lifetimeShield = 0;

	for (let year = 1; year <= Math.max(1, Math.round(input.horizonYears)); year += 1) {
		const rentNow = input.rentMonthly * Math.pow(1 + monthlyGrowth, (year - 1) * 12);
		const taxMonthly = (price * input.taxRate) / 12;
		const insuranceMonthly = Math.max(0, input.insuranceAnnual) / 12;
		const maintenanceMonthly = (price * Math.max(0, input.maintenanceShare)) / 12;
		const ownerOutflow = payment + taxMonthly + insuranceMonthly + maintenanceMonthly;

		// Within the year, both paths contribute the difference between the two outflows to whichever
		// portfolio is on the cheaper side, and both portfolios compound every month. Interest is
		// accumulated so the shield can be priced at the year boundary with the real figure rather
		// than a year-one constant.
		for (let month = 0; month < 12; month += 1) {
			if (ownerOutflow < rentNow) {
				ownerPortfolio = ownerPortfolio * (1 + monthlyReturn) + (rentNow - ownerOutflow);
				renterPortfolio = renterPortfolio * (1 + monthlyReturn);
			} else {
				renterPortfolio = renterPortfolio * (1 + monthlyReturn) + (ownerOutflow - rentNow);
				ownerPortfolio = ownerPortfolio * (1 + monthlyReturn);
			}
		}

		const monthsElapsed = year * 12;
		const interestThisYear = interestPaid(loan, input.rate, input.termMonths, monthsElapsed) -
			interestPaid(loan, input.rate, input.termMonths, monthsElapsed - 12);
		const shieldResult = computeTaxShield({
			mortgageInterest: Math.max(0, interestThisYear),
			propertyTax: price * input.taxRate,
			stateIncomeTax: input.stateIncomeTax,
			charitable: 0,
			magi: input.magi,
			filingStatus: input.filingStatus
		});
		ownerPortfolio += shieldResult.shield;
		lifetimeShield += shieldResult.shield;

		const homeValue = price * Math.pow(1 + appreciation, year);
		const balance = calculateProspectiveBalance(loan, input.rate, input.termMonths, Math.min(monthsElapsed, input.termMonths));
		const ownerWealth = homeValue * (1 - input.sellFriction) - balance + ownerPortfolio;
		const renterWealth = renterPortfolio;

		series.push({
			year,
			ownerWealth,
			renterWealth,
			gap: renterWealth - ownerWealth,
			ownerOutflow,
			rent: rentNow,
			shield: shieldResult.shield,
			balance,
			homeValue
		});

		// The parity trace stops here: the monthly difference is what makes the two paths comparable,
		// and it has already been banked into whichever portfolio was on the cheaper side.
	}

	return { series, lifetimeShield };
}

export function runRentVsBuy(input: RentVsBuyInputs): RentVsBuyResult {
	const { series, lifetimeShield } = simulate(input, input.appreciation, input.investReturn);

	const crossing = series.find((row) => row.ownerWealth >= row.renterWealth);
	const breakEvenYear = crossing ? crossing.year : null;

	const terminalYears = [3, 5, 7, 10].filter((year) => year <= input.horizonYears);
	const terminal = terminalYears.map((year) => {
		const row = series[year - 1] ?? series[series.length - 1];
		return { year, owner: row.ownerWealth, renter: row.renterWealth };
	});

	const sensitivity: RentVsBuyResult['sensitivity'] = [];
	for (const appreciation of [0.01, 0.0165, 0.023]) {
		for (const investReturn of [0.04, 0.06, 0.08]) {
			const run = simulate(input, appreciation, investReturn);
			const hit = run.series.find((row) => row.ownerWealth >= row.renterWealth);
			sensitivity.push({ appreciation, investReturn, breakEvenYear: hit ? hit.year : null });
		}
	}

	const upfrontBuyer = input.price * (input.downShare + input.buyClosingShare);
	const first = series[0];

	return {
		series,
		breakEvenYear,
		terminal,
		upfront: { buyer: upfrontBuyer, renter: upfrontBuyer },
		yearOneOutflow: { owner: first?.ownerOutflow ?? 0, rent: first?.rent ?? 0 },
		lifetimeShield,
		sensitivity
	};
}
