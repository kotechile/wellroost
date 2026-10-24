/**
 * Insurance coverage gap.
 *
 * Three numbers a homeowner has never been shown together:
 *
 * 1. What a percentage deductible costs in dollars. A 5% named-storm deductible on a $500,000
 *    dwelling limit is $25,000 before the carrier pays anything, and it is calculated against the
 *    Coverage A limit — not against the damage.
 * 2. What an actual-cash-value settlement withholds on an aged roof. The depreciation is charged
 *    against the replacement cost, straight-line by age over expected life, and it is the number the
 *    "second check" is supposed to recover.
 * 3. What both of those mean as one liquid figure on the day of a loss, which is the only number a
 *    household can compare against its savings.
 *
 * The depreciation schedule belongs to the adjuster, so the engine does not pretend to know it: the
 * straight-line figure is labelled as an estimate, and the reader is told to check the schedule
 * endorsement in the policy.
 */
import { ROOF_LIVES } from './data/components';

export interface InsuranceGapInputs {
	coverageA: number;
	flatDeductible: number;
	perilDeductibles: { wind: number; hail: number; namedStorm: number; hurricane: number };
	roofMaterial: string;
	roofAge: number;
	roofReplacementCost: number;
	settlement: 'rcv' | 'acv';
	/** True when a claim is already open, which starts the depreciation-recovery clock. */
	claimOpen: boolean;
	monthsSinceClaim: number;
}

export interface InsuranceGapResult {
	perils: Array<{ id: string; label: string; share: number; dollars: number }>;
	maxPeril: { label: string; dollars: number };
	depreciation: { ratio: number; withheld: number; paysOut: number; life: number };
	/** Cash needed on the worst single day: the largest peril deductible plus the withheld depreciation. */
	liquidExposure: number;
	/** Months left in the typical 12-month window to recover withheld depreciation. */
	recoveryMonthsLeft: number | null;
	verdict: 'gap-dominated' | 'deductible-dominated' | 'covered';
}

const LABELS: Record<keyof InsuranceGapInputs['perilDeductibles'], string> = {
	wind: 'Wind',
	hail: 'Hail',
	namedStorm: 'Named storm',
	hurricane: 'Hurricane'
};

export function runInsuranceGap(input: InsuranceGapInputs): InsuranceGapResult {
	const coverage = Math.max(0, input.coverageA);

	const perils = (Object.keys(LABELS) as Array<keyof typeof LABELS>).map((id) => {
		const share = Math.max(0, input.perilDeductibles[id]);
		return { id, label: LABELS[id], share, dollars: coverage * share };
	});

	const maxPeril = perils.reduce(
		(best, peril) => (peril.dollars > best.dollars ? peril : best),
		{ label: 'None', dollars: Math.max(0, input.flatDeductible) }
	);

	const roofLife = ROOF_LIVES.find((item) => item.id === input.roofMaterial)?.life ?? 25;
	const ageRatio = Math.min(1, Math.max(0, input.roofAge) / roofLife);
	const ratio = input.settlement === 'acv' ? ageRatio : 0;
	const replacement = Math.max(0, input.roofReplacementCost);
	const withheld = replacement * ratio;

	const liquidExposure = Math.max(maxPeril.dollars, input.flatDeductible) + withheld;
	const recoveryMonthsLeft = input.claimOpen ? Math.max(0, 12 - Math.max(0, input.monthsSinceClaim)) : null;

	const verdict =
		withheld > Math.max(maxPeril.dollars, input.flatDeductible)
			? 'gap-dominated'
			: liquidExposure > 0
				? 'deductible-dominated'
				: 'covered';

	return {
		perils,
		maxPeril,
		depreciation: { ratio, withheld, paysOut: Math.max(0, replacement - withheld), life: roofLife },
		liquidExposure,
		recoveryMonthsLeft,
		verdict
	};
}
