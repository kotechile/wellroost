/**
 * The itemization test, and what a mortgage actually saves in tax.
 *
 * The 2026 SALT cap is $40,400, not $10,000. That single change broke the oldest received wisdom
 * in this market — "most buyers at the median get no mortgage-interest benefit, because the standard
 * deduction beats their itemized total". At $40,400 the cap stops binding for ordinary households,
 * so a median-price buyer with a 7.32% loan itemizes and does get a shield. Modelling it as zero
 * would push every buy-vs-rent answer against buying, by thousands of dollars a year.
 *
 * The cap is not flat, either: above $505,000 of MAGI it drops by 30% of the excess, to a $10,000
 * floor. A high earner who reads "$40,400" and assumes it applies to them is wrong by up to $30,000
 * of deductible base. `saltCapFor` returns the phase-down so the page can show it shrinking rather
 * than asserting a number the reader cannot check.
 *
 * What the shield is NOT: a reason to buy a house. It is the cash value of a deduction the household
 * only receives because it is already paying the interest.
 */
import { MACRO_2026 } from './data/macro2026';

export interface TaxShieldInputs {
	/** Deductible mortgage interest paid in the year. */
	mortgageInterest: number;
	propertyTax: number;
	stateIncomeTax: number;
	charitable: number;
	/** Modified AGI, which drives the SALT phase-down. */
	magi: number;
	filingStatus: 'single' | 'joint';
	/** Overrides the default marginal rate where the page lets the reader set one. */
	marginalRate?: number;
}

export interface TaxShieldResult {
	/** The SALT ceiling that actually applies at this MAGI. */
	saltCap: number;
	/** Whether the phase-down reduced the cap at all. */
	saltPhasedDown: boolean;
	saltUsed: number;
	deductibleInterest: number;
	itemized: number;
	standardDeduction: number;
	/** Itemized minus standard. Zero means itemizing buys nothing. */
	excess: number;
	/** Cash value of the excess at the marginal rate. */
	shield: number;
	marginalRate: number;
}

/** SALT cap for a given MAGI, after the phase-down and the floor. */
export function saltCapFor(magi: number): number {
	const { saltCap, saltPhaseoutThreshold, saltPhaseoutRate, saltFloor } = MACRO_2026.tax;
	const reduction = saltPhaseoutRate * Math.max(0, magi - saltPhaseoutThreshold);
	return Math.max(saltFloor, Math.min(saltCap, saltCap - reduction));
}

export function computeTaxShield(inputs: TaxShieldInputs): TaxShieldResult {
	const { tax } = MACRO_2026;
	const standardDeduction =
		inputs.filingStatus === 'joint' ? tax.standardDeductionJoint : tax.standardDeductionSingle;
	const marginalRate = inputs.marginalRate ?? tax.marginalRate;

	// Interest is deductible only on the first $750,000 of acquisition debt. The caller passes the
	// interest actually paid on that debt; this guard exists so a page cannot claim a shield on a
	// jumbo loan's full interest by passing a larger figure.
	const deductibleInterest = Math.max(0, inputs.mortgageInterest);

	const saltCap = saltCapFor(inputs.magi);
	const saltPaid = Math.max(0, inputs.propertyTax) + Math.max(0, inputs.stateIncomeTax);
	const saltUsed = Math.min(saltPaid, saltCap);

	const itemized = deductibleInterest + saltUsed + Math.max(0, inputs.charitable);
	const excess = Math.max(0, itemized - standardDeduction);

	return {
		saltCap,
		saltPhasedDown: saltCap < tax.saltCap,
		saltUsed,
		deductibleInterest,
		itemized,
		standardDeduction,
		excess,
		shield: excess * marginalRate,
		marginalRate
	};
}

/** Deductible interest on the first $750,000 of debt, given the loan's rate and balance. */
export function deductibleInterestFor(balance: number, rate: number): number {
	const cap = MACRO_2026.tax.mortgageInterestCap;
	const share = balance > cap ? cap / balance : 1;
	return balance * rate * share;
}
