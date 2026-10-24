/**
 * True cost of ownership: the payment the listing did not print.
 *
 * PITI is a four-letter answer to a five-part question, and the missing part is usually the largest
 * surprise. This engine keeps the parts separate on purpose — one row per liability, never a single
 * monthly figure — because the point of the page is that the escrow line is not one number.
 *
 * The tax row is the one that changes with the buyer. In an acquisition-value state the assessment
 * resets on sale, so the seller's bill is not a forecast of the buyer's; the engine computes the
 * reassessed figure from the price and shows the delta explicitly. In an annual-reassessment state
 * the seller's bill is closer to the truth, and the engine says which case it is in.
 *
 * The reserve row is not a rule of thumb. It comes from the same hazard model the sinking-fund
 * engine uses, so a 1998 house with original systems carries a materially different monthly cost than
 * a 2019 house with none.
 */
import { calculateMonthlyPayment } from './amortization';
import { reserveMonthly, type ComponentInput } from './sinkingFund';
import {
	annualTax,
	defaultEffectiveRate,
	jurisdictionById,
	JURISDICTIONS,
	type Jurisdiction
} from './data/jurisdictions';

export interface OwnershipCostInputs {
	price: number;
	downPaymentShare: number;
	rate: number;
	termMonths: number;
	jurisdictionId: string;
	/** Overrides the seeded effective rate. The visitor's tax bill is the authority. */
	effectiveTaxRate: number | null;
	insuranceAnnual: number;
	floodAnnual: number;
	hoaMonthly: number;
	/** Reserve study funding level, 0 to 1. Below 0.7 the engine models a special assessment. */
	hoaReserveFunding: number;
	/** Monthly dues excluded from the special-assessment model. */
	components: ComponentInput[];
}

export interface OutflowRow {
	id: string;
	label: string;
	monthly: number;
	note?: string;
}

export interface OwnershipCostResult {
	modelable: boolean;
	coverage: string[];
	jurisdiction?: Jurisdiction;
	rows: OutflowRow[];
	monthly: number;
	principalInterest: number;
	taxYear1: number;
	/** What the seller's bill would have been, for the step-up comparison. */
	sellerTaxAnnual: number;
	taxStepUp: number;
	nonDebtShare: number;
	projection: Array<{ year: number; monthly: number; tax: number; insurance: number; hoa: number; reserve: number }>;
	specialAssessment: number;
}

const SPECIAL_ASSESSMENT_MONTHS = 36;

export function runOwnershipCost(input: OwnershipCostInputs): OwnershipCostResult {
	const jurisdiction = jurisdictionById(input.jurisdictionId);
	if (!jurisdiction) {
		return {
			modelable: false,
			coverage: JURISDICTIONS.map((item) => item.label),
			rows: [],
			monthly: 0,
			principalInterest: 0,
			taxYear1: 0,
			sellerTaxAnnual: 0,
			taxStepUp: 0,
			nonDebtShare: 0,
			projection: [],
			specialAssessment: 0
		};
	}

	const price = Math.max(0, input.price);
	const loan = Math.max(0, price * (1 - Math.min(1, Math.max(0, input.downPaymentShare))));
	const principalInterest = calculateMonthlyPayment(loan, input.rate, Math.max(1, input.termMonths));

	const rate = input.effectiveTaxRate ?? defaultEffectiveRate(jurisdiction);
	const taxYear1 = annualTax(price, jurisdiction, rate);

	// The seller's bill is modelled as the price less the appreciation the roll has not caught up with
	// in acquisition-value states; elsewhere the roll is near market and the step-up is small.
	const sellerBasis =
		jurisdiction.reassessment === 'acquisition' ? price * 0.62 : price * 0.97;
	const sellerTaxAnnual = annualTax(sellerBasis, jurisdiction, rate);
	const taxStepUp = taxYear1 - sellerTaxAnnual;

	const insuranceMonthly = Math.max(0, input.insuranceAnnual + input.floodAnnual) / 12;
	const hoaMonthly = Math.max(0, input.hoaMonthly);
	const reserve = reserveMonthly(input.components, 5);

	// Reserve studies that report less than 70% funding imply a cash call. The engine spreads a
	// modelled assessment over three years rather than pretending the dues cover it.
	const deficiency = Math.max(0, 0.7 - Math.min(1, Math.max(0, input.hoaReserveFunding)));
	const specialAssessment = hoaMonthly > 0 && deficiency > 0 ? (deficiency * 12 * hoaMonthly * 3) / 1 : 0;
	const specialAssessmentMonthly = specialAssessment / SPECIAL_ASSESSMENT_MONTHS;

	const rows: OutflowRow[] = [
		{
			id: 'pi',
			label: 'Principal and interest',
			monthly: principalInterest,
			note: `${(input.rate * 100).toFixed(2)}% on ${loan.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
		},
		{
			id: 'tax',
			label: 'Property tax, reassessed',
			monthly: taxYear1 / 12,
			note: `${jurisdiction.label} at ${(rate * 100).toFixed(2)}% effective`
		},
		{ id: 'insurance', label: 'Insurance, indexed', monthly: insuranceMonthly, note: 'Your quote, not a national average' },
		{
			id: 'hoa',
			label: 'HOA dues',
			monthly: hoaMonthly,
			note: hoaMonthly > 0 ? `${Math.round(Math.min(1, Math.max(0, input.hoaReserveFunding)) * 100)}% reserve funding` : undefined
		},
		{ id: 'reserve', label: 'Capital reserve', monthly: reserve, note: 'Five-year hazard model, not 1% of value' }
	];

	if (specialAssessmentMonthly > 0) {
		rows.push({
			id: 'assessment',
			label: 'Modelled special assessment',
			monthly: specialAssessmentMonthly,
			note: 'Spread over 36 months from a thin reserve study'
		});
	}

	const monthly = rows.reduce((sum, row) => sum + row.monthly, 0);
	const nonDebtShare = monthly > 0 ? 1 - principalInterest / monthly : 0;

	const projection = [1, 5, 10].map((year) => {
		const tax = (taxYear1 * Math.pow(1.04, year - 1)) / 12;
		const insurance = (Math.max(0, input.insuranceAnnual + input.floodAnnual) * Math.pow(1.08, year - 1)) / 12;
		const hoa = (hoaMonthly * Math.pow(1.04, year - 1)) + (year <= 3 ? specialAssessmentMonthly : 0);
		const reserveNow = reserve * Math.pow(1.05, year - 1);
		return {
			year,
			monthly: principalInterest + tax + insurance + hoa + reserveNow,
			tax,
			insurance,
			hoa,
			reserve: reserveNow
		};
	});

	return {
		modelable: true,
		coverage: JURISDICTIONS.map((item) => item.label),
		jurisdiction,
		rows,
		monthly,
		principalInterest,
		taxYear1,
		sellerTaxAnnual,
		taxStepUp,
		nonDebtShare,
		projection,
		specialAssessment
	};
}
