/**
 * Fixed-rate amortization, in one place.
 *
 * Every engine in this directory borrows from here: the recast ledger, the floating-rate stress
 * test, the ownership-cost stack, the outflow-parity ledger, the concession comparison and the
 * down-payment comparison all need the same three primitives. Two copies of an amortization
 * routine do not agree to the cent — they drift, first by a rounding, then by a payment — so there
 * is exactly one copy.
 *
 * `paymentFactor` is the primitive the others are built from: the payment per dollar of principal.
 * It carries the invariant that makes a recast auditable —
 *
 *     relief = curtailment × paymentFactor(rate, remainingMonths)
 *
 * — which is independent of the balance. Balance changes move the payment; only the curtailment
 * moves the *relief*. That is why the recast engine can answer "how much must I curtail to get
 * $400 a month back" without the visitor first getting the balance right.
 */

/** Monthly payment on a fixed-rate loan. Returns 0 for a zero balance or term. */
export function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
	if (principal <= 0 || termMonths <= 0) return 0;
	if (annualRate <= 0) return principal / termMonths;
	const r = annualRate / 12;
	const growth = Math.pow(1 + r, termMonths);
	return (principal * (r * growth)) / (growth - 1);
}

/** Payment per $1 of principal — the amortization factor at this rate and term. */
export function paymentFactor(annualRate: number, termMonths: number): number {
	if (termMonths <= 0) return 0;
	if (annualRate <= 0) return 1 / termMonths;
	return calculateMonthlyPayment(1, annualRate, termMonths);
}

/** Outstanding balance after `monthsElapsed` payments on the original schedule. */
export function calculateProspectiveBalance(
	principal: number,
	annualRate: number,
	termMonths: number,
	monthsElapsed: number
): number {
	if (principal <= 0 || termMonths <= 0) return 0;
	if (monthsElapsed <= 0) return principal;
	if (monthsElapsed >= termMonths) return 0;
	if (annualRate <= 0) return Math.max(0, principal - (principal / termMonths) * monthsElapsed);

	const r = annualRate / 12;
	const growth = Math.pow(1 + r, termMonths);
	const paid = Math.pow(1 + r, monthsElapsed);
	return (principal * (growth - paid)) / (growth - 1);
}

/** Cumulative interest paid over the first `months` payments of the schedule. */
export function interestPaid(
	principal: number,
	annualRate: number,
	termMonths: number,
	months: number
): number {
	if (principal <= 0 || months <= 0) return 0;
	const payment = calculateMonthlyPayment(principal, annualRate, termMonths);
	const horizon = Math.min(months, termMonths);
	const endBalance = calculateProspectiveBalance(principal, annualRate, termMonths, horizon);
	return Math.max(0, payment * horizon - (principal - endBalance));
}

/** Curtailment required to buy a given monthly relief, at the same rate over the same remaining term. */
export function curtailmentForRelief(relief: number, annualRate: number, remainingMonths: number): number {
	const factor = paymentFactor(annualRate, remainingMonths);
	if (factor <= 0) return 0;
	return relief / factor;
}

/**
 * Months until a declining balance reaches `target` under a fixed payment.
 * Used by the PMI path, where the milestone is 80% / 78% loan-to-value rather than a date.
 */
export function monthsToBalance(
	principal: number,
	annualRate: number,
	monthlyPayment: number,
	target: number
): number | null {
	if (principal <= target) return 0;
	if (monthlyPayment <= 0) return null;
	const r = annualRate / 12;
	for (let month = 1; month <= 600; month += 1) {
		const balance =
			r > 0
				? principal * Math.pow(1 + r, month) - (monthlyPayment * (Math.pow(1 + r, month) - 1)) / r
				: principal - monthlyPayment * month;
		if (balance <= target) return month;
	}
	return null;
}

/** Present value of a level annual amount, discounted at `rate` for `years`. */
export function presentValue(annual: number, rate: number, years: number): number {
	if (years <= 0) return 0;
	if (rate <= 0) return annual * years;
	let total = 0;
	for (let year = 1; year <= years; year += 1) total += annual / Math.pow(1 + rate, year);
	return total;
}
