/**
 * Down payment and mortgage insurance: the balance-sheet trade, not the payment trade.
 *
 * Every down-payment calculator compares monthly payments. That comparison hides the actual decision,
 * which is about cash: a smaller down payment preserves reserves at a known annual premium, and the
 * premium is temporary — it cancels at 80% loan-to-value on request and at 78% automatically. What a
 * household needs is the cumulative premium paid along each path, the month it stops, and how much
 * liquid cash is left on the day the keys are handed over.
 *
 * The assistance section prices the thing nobody quotes: a below-market or deferred second lien is
 * usually paired with a first lien at a higher rate, and that surcharge is a real cost that has to be
 * measured against the assistance rather than admired. Program terms are inputs, not a dataset — the
 * offer letter is the authority, and no national table stays true for a quarter.
 */
import { calculateMonthlyPayment, monthsToBalance } from './amortization';

const MI_BANDS: Array<{ maxLtv: number; rate: number }> = [
	// Ascending, because the first band whose ceiling the loan clears is the one that applies.
	// At exactly 80% there is no mortgage insurance on a conventional loan, which is the whole point
	// of the 20% threshold.
	{ maxLtv: 0.8, rate: 0 },
	{ maxLtv: 0.85, rate: 0.0032 },
	{ maxLtv: 0.9, rate: 0.0052 },
	{ maxLtv: 0.95, rate: 0.0078 },
	{ maxLtv: 1, rate: 0.011 }
];

export interface DownPaymentInputs {
	price: number;
	rate: number;
	termMonths: number;
	/** Down payment shares to compare, e.g. 0.03, 0.10, 0.15, 0.20. */
	tiers: number[];
	closingCostShare: number;
	/** Monthly reserves the household wants to keep after closing. */
	reserveTarget: number;
	assistance: {
		amount: number;
		/** Extra rate on the first lien when the loan is paired with assistance. */
		rateSurcharge: number;
		/** True when the second lien is forgiven rather than repaid. */
		forgiven: boolean;
	};
	yearsToHold: number;
}

export interface DownPaymentTier {
	downShare: number;
	downCash: number;
	loan: number;
	ltv: number;
	miRate: number;
	monthlyMi: number;
	payment: number;
	paymentWithMi: number;
	/** Month the borrower can request cancellation at 80% LTV. */
	cancellationMonth: number | null;
	/** Month the servicer must terminate at 78% LTV. */
	terminationMonth: number | null;
	cumulativeMiOverHold: number;
	cashLeftAfterClosing: number;
	meetsReserveTarget: boolean;
}

export interface DownPaymentResult {
	tiers: DownPaymentTier[];
	assistance: {
		amount: number;
		costOfSurcharge: number;
		netBenefit: number;
		verdict: 'take-it' | 'close' | 'decline';
	};
	/** The tier that leaves the most cash while still clearing the reserve target. */
	recommended: number;
}

const miRateFor = (ltv: number) => MI_BANDS.find((band) => ltv <= band.maxLtv)?.rate ?? 0;

export function runDownPayment(input: DownPaymentInputs): DownPaymentResult {
	const price = Math.max(0, input.price);
	const years = Math.max(1, input.yearsToHold);

	const tiers: DownPaymentTier[] = [...new Set(input.tiers)]
		.filter((share) => share >= 0 && share <= 1)
		.sort((a, b) => a - b)
		.map((share) => {
			const downCash = price * share;
			const loan = Math.max(0, price - downCash);
			const ltv = price > 0 ? loan / price : 0;
			const miRate = miRateFor(ltv);
			const payment = calculateMonthlyPayment(loan, input.rate, Math.max(1, input.termMonths));
			const monthlyMi = (loan * miRate) / 12;
			const cancelAt = loan > 0 ? monthsToBalance(loan, input.rate, payment, price * 0.8) : 0;
			const terminateAt = loan > 0 ? monthsToBalance(loan, input.rate, payment, price * 0.78) : 0;
			const monthsOfMi = Math.min(cancelAt ?? years * 12, years * 12);
			const cashLeft = input.reserveTarget > 0 ? input.reserveTarget - (downCash + price * input.closingCostShare) : -(downCash + price * input.closingCostShare);

			return {
				downShare: share,
				downCash,
				loan,
				ltv,
				miRate,
				monthlyMi,
				payment,
				paymentWithMi: payment + monthlyMi,
				cancellationMonth: cancelAt,
				terminationMonth: terminateAt,
				cumulativeMiOverHold: monthlyMi * Math.max(0, monthsOfMi),
				cashLeftAfterClosing: cashLeft,
				meetsReserveTarget: cashLeft >= 0
			};
		});

	// The assistance package: the surcharge is charged on the first lien for the hold period, and the
	// second lien is either forgiven (free money) or repaid (a second payment the model ignores here
	// because its terms are inputs on the page, not assumptions the engine can invent).
	const surchargeAnnual = price * (1 - (input.tiers[0] ?? 0.05)) * input.assistance.rateSurcharge;
	const costOfSurcharge = surchargeAnnual * years;
	const netBenefit = input.assistance.amount - costOfSurcharge;
	const assistanceVerdict: DownPaymentResult['assistance']['verdict'] =
		netBenefit > input.assistance.amount * 0.25 ? 'take-it' : netBenefit > 0 ? 'close' : 'decline';

	const eligible = tiers.filter((tier) => tier.meetsReserveTarget);
	const recommended = (eligible.length > 0 ? eligible : tiers)[0]?.downShare ?? 0.1;

	return {
		tiers,
		assistance: {
			amount: Math.max(0, input.assistance.amount),
			costOfSurcharge,
			netBenefit,
			verdict: input.assistance.forgiven ? assistanceVerdict : netBenefit > 0 ? 'close' : 'decline'
		},
		recommended
	};
}
