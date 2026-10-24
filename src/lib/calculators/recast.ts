/**
 * Recast vs refinance.
 *
 * The whole engine turns on one identity:
 *
 *     relief = curtailment × paymentFactor(noteRate, monthsRemaining)
 *
 * Relief depends on the curtailment, not on the balance. Two consequences follow, and both shape the
 * page rather than just the math:
 *
 * 1. The visitor does not have to type the balance correctly to get a trustworthy answer about the
 *    relief — only to see the resulting payment. So the page leads with relief and answers the
 *    inverse question too: "I need $400 a month back; how much do I curtail?"
 * 2. A recast is not a refinance with paperwork removed. It preserves the term AND the rate, which
 *    means the only thing that changes is the payment and the payoff date stays where it was. The
 *    refinance column exists to show what that preservation is worth at today's market.
 *
 * Gates are statements about servicers, not about arithmetic, so they never suppress the numbers —
 * they sit beside them. A visitor on an FHA loan still learns what their curtailment would buy; they
 * also learn that their servicer will not offer it.
 */
import {
	calculateMonthlyPayment,
	curtailmentForRelief,
	paymentFactor
} from './amortization';
import { MACRO_2026 } from './data/macro2026';

export type LoanType = 'conventional' | 'fha' | 'va' | 'usda' | 'jumbo';

export interface RecastInputs {
	/** Unpaid principal today, not the original note amount. */
	balance: number;
	noteRate: number;
	monthsRemaining: number;
	curtailment: number;
	servicerFee: number;
	/** Market 30-year rate, used for the refinance column. */
	marketRate: number;
	/** Refinance closing costs as a share of the balance. */
	refiClosingShare: number;
	/** Return available on the same cash if it is not curtailed. */
	deployReturn: number;
	loanType: LoanType;
	/** Monthly relief the visitor is trying to buy. Drives the inverse solve. */
	targetRelief: number;
}

export interface RecastResult {
	baselinePayment: number;
	newBalance: number;
	recastPayment: number;
	reliefMonthly: number;
	reliefAnnual: number;
	/** Months of relief that pay the servicer fee back. Null when there is no relief. */
	paybackMonths: number | null;
	/** Total interest avoided over the remaining term: relief × months, exactly. */
	interestSaved: number;
	/** Curtailment needed to buy the visitor's target relief. */
	curtailmentForTarget: number;
	/** Total to curtail to hit the target, including the shortfall against the current plan. */
	targetShortfall: number;
	refinance: {
		closingCost: number;
		paymentSameTerm: number;
		paymentFullTerm: number;
		/** Principal-and-interest change against the current note, at the same remaining term. */
		paymentDeltaSameTerm: number;
		/** Rate a 30-year refinance would need to match the recast payment. */
		rateToMatchRecast: number | null;
		/** Cash out of pocket at closing, which the recast does not charge. */
		cashAtClosing: number;
	};
	deployment: {
		years: number;
		invested: number;
		investedGain: number;
		guaranteedGain: number;
	};
	gates: string[];
	/** False when the math runs but the product does not exist for this loan. */
	eligible: boolean;
}

/** Bisection for the rate that produces a given payment. Used to price a refinance backwards. */
export function rateToMatchPayment(
	balance: number,
	targetPayment: number,
	termMonths: number,
	guessCeiling = 0.25
): number | null {
	if (balance <= 0 || targetPayment <= 0 || termMonths <= 0) return null;
	const at = (rate: number) => calculateMonthlyPayment(balance, rate, termMonths);
	if (at(0) > targetPayment) return null;
	let low = 0;
	let high = guessCeiling;
	if (at(high) < targetPayment) return null;
	for (let step = 0; step < 200; step += 1) {
		const mid = (low + high) / 2;
		if (at(mid) < targetPayment) low = mid;
		else high = mid;
	}
	return (low + high) / 2;
}

export function runRecast(input: RecastInputs): RecastResult {
	const balance = Math.max(0, input.balance);
	const curtailment = Math.max(0, Math.min(input.curtailment, balance));
	const months = Math.max(1, Math.round(input.monthsRemaining));

	const baselinePayment = calculateMonthlyPayment(balance, input.noteRate, months);
	const newBalance = Math.max(0, balance - curtailment);
	const recastPayment = calculateMonthlyPayment(newBalance, input.noteRate, months);
	const reliefMonthly = Math.max(0, baselinePayment - recastPayment);
	const reliefAnnual = reliefMonthly * 12;
	const paybackMonths = reliefMonthly > 0 ? Math.max(0, input.servicerFee) / reliefMonthly : null;
	const interestSaved = reliefMonthly * months;

	const factor = paymentFactor(input.noteRate, months);
	const curtailmentForTarget = factor > 0 ? curtailmentForRelief(Math.max(0, input.targetRelief), input.noteRate, months) : 0;
	const targetShortfall = Math.max(0, curtailmentForTarget - curtailment);

	const closingCost = balance * Math.max(0, input.refiClosingShare);
	const paymentSameTerm = calculateMonthlyPayment(balance, input.marketRate, months);
	const paymentFullTerm = calculateMonthlyPayment(balance, input.marketRate, 360);
	const rateToMatchRecast = rateToMatchPayment(balance, recastPayment, 360);

	// Ten years is the comparison horizon: long enough for compounding to matter, short enough that
	// a visitor recognises the period as one they might actually hold the house for.
	const years = 10;
	const investedGain = curtailment * (Math.pow(1 + input.deployReturn, years) - 1);
	const guaranteedGain = curtailment * (Math.pow(1 + input.noteRate, years) - 1);

	const gates: string[] = [];
	let eligible = true;

	if (input.loanType !== 'conventional') {
		eligible = false;
		gates.push(
			input.loanType === 'jumbo'
				? 'Above the conforming limit, this is a jumbo loan. Recasts are a Fannie Mae and Freddie Mac servicing feature, so the servicer is unlikely to re-amortize it.'
				: 'FHA, VA and USDA loans cannot be recast. The refinance column still applies; the relief below is what a re-amortization would buy if the loan allowed it.'
		);
	}
	if (balance > MACRO_2026.conformingLimit.baseline1Unit && input.loanType === 'conventional') {
		gates.push(
			`Above the ${MACRO_2026.conformingLimit.baseline1Unit.toLocaleString('en-US')} conforming baseline for 2026. High-cost counties allow more; confirm the limit for your county with the servicer before relying on this.`
		);
	}
	if (curtailment > 0 && curtailment < 5000) {
		gates.push('Most servicers set a $5,000 to $10,000 minimum curtailment. Below it, the fee usually buys nothing.');
	}
	if (input.noteRate <= input.marketRate) {
		gates.push(
			`The note rate is at or below the ${(input.marketRate * 100).toFixed(2)}% market rate, so a refinance raises the payment before it lowers anything.`
		);
	}

	return {
		baselinePayment,
		newBalance,
		recastPayment,
		reliefMonthly,
		reliefAnnual,
		paybackMonths,
		interestSaved,
		curtailmentForTarget,
		targetShortfall,
		refinance: {
			closingCost,
			paymentSameTerm,
			paymentFullTerm,
			paymentDeltaSameTerm: paymentSameTerm - baselinePayment,
			rateToMatchRecast,
			cashAtClosing: closingCost
		},
		deployment: { years, invested: curtailment, investedGain, guaranteedGain },
		gates,
		eligible
	};
}
