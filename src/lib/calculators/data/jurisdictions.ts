/**
 * Property tax, by jurisdiction, as statute — not as a national average.
 *
 * Two engines read this: the ownership-cost stack (which needs the step-up a sale triggers) and the
 * appeal audit (which needs the ratio that converts an assessed value back into the market value the
 * county is implying). Both refuse to compute outside the table. That refusal is the feature: a
 * property tax rate invented for an unmodeled county is a wrong number the reader will believe,
 * because it arrives looking exactly like the right one.
 *
 * `effectiveRate` is a seeded range and always shown as a range with the note that the reader's own
 * tax bill wins. The *ratio* and the *reassessment rule* are statutory and stable; the millage is
 * local and moves every year, which is why it is a default the visitor can overwrite.
 */
export interface Jurisdiction {
	/** Stable key. County variants carry their county in the key. */
	id: string;
	label: string;
	state: string;
	/** Statutory share of market value placed on the roll. */
	assessmentRatio: number;
	/** Equalisation factor where the state publishes one. */
	equalization?: number;
	/** Typical residential effective rate against market value: low, high. */
	effectiveRate: [number, number];
	reassessment:
		| 'annual'
		| 'acquisition'
		| 'cyclical';
	/** Statutory cap on growth in taxable value, where one exists. */
	taxCap?: { rate: number; basis: string };
	appeal: { board: string; deadline: string; filingFee: number };
	/** Share of filed residential appeals that produce a reduction. */
	contestedShare: number;
	medianAward: number;
	note: string;
	source: string;
}

export const JURISDICTIONS: Jurisdiction[] = [
	{
		id: 'tx',
		label: 'Texas',
		state: 'TX',
		assessmentRatio: 1,
		effectiveRate: [0.018, 0.021],
		reassessment: 'annual',
		taxCap: { rate: 0.1, basis: 'Homestead taxable-value cap, 10% a year' },
		appeal: { board: 'Appraisal review board', deadline: 'May 15, or 30 days after the notice', filingFee: 0 },
		contestedShare: 0.5,
		medianAward: 600,
		note: 'Full market value on the roll; the homestead cap limits the annual taxable increase, not the assessment.',
		source: 'Tex. Tax Code §23.01; appraisal district notices'
	},
	{
		id: 'ca',
		label: 'California',
		state: 'CA',
		assessmentRatio: 1,
		effectiveRate: [0.011, 0.0125],
		reassessment: 'acquisition',
		taxCap: { rate: 0.02, basis: 'Proposition 13 base year, 2% inflation factor' },
		appeal: { board: 'County assessment appeals board', deadline: 'November 30 or the 60th day after the notice', filingFee: 0 },
		contestedShare: 0.45,
		medianAward: 539,
		note: 'The roll carries the acquisition-year value, so a sale resets the bill to market. That reset is the number a listing never prints.',
		source: 'Cal. Rev. & Tax. Code §51; Prop 13'
	},
	{
		id: 'il-cook',
		label: 'Illinois — Cook County',
		state: 'IL',
		assessmentRatio: 0.1,
		effectiveRate: [0.021, 0.0245],
		reassessment: 'cyclical',
		appeal: { board: 'Assessor, then the Board of Review', deadline: '30 days from the township notice', filingFee: 0 },
		contestedShare: 0.55,
		medianAward: 606,
		note: 'Classified assessment at 10% of market value, then a state equalisation factor is applied.',
		source: 'Cook County ordinance; 35 ILCS 200'
	},
	{
		id: 'il-other',
		label: 'Illinois — outside Cook',
		state: 'IL',
		assessmentRatio: 1 / 3,
		effectiveRate: [0.0195, 0.023],
		reassessment: 'cyclical',
		appeal: { board: 'County board of review', deadline: '30 days from the notice', filingFee: 0 },
		contestedShare: 0.45,
		medianAward: 560,
		note: 'One third of fair cash value is the statutory standard outside Cook County.',
		source: '35 ILCS 200/9-145'
	},
	{
		id: 'oh',
		label: 'Ohio',
		state: 'OH',
		assessmentRatio: 0.35,
		effectiveRate: [0.016, 0.019],
		reassessment: 'cyclical',
		appeal: { board: 'County board of revision', deadline: 'March 31', filingFee: 0 },
		contestedShare: 0.4,
		medianAward: 550,
		note: 'A uniform 35% ratio, with the 10% rollback and the 2.5% reduction applied to the gross tax.',
		source: 'ORC 5713.03; ORC 319.302'
	},
	{
		id: 'ga',
		label: 'Georgia',
		state: 'GA',
		assessmentRatio: 0.4,
		effectiveRate: [0.009, 0.0115],
		reassessment: 'annual',
		appeal: { board: 'County board of equalization', deadline: '45 days from the notice', filingFee: 0 },
		contestedShare: 0.4,
		medianAward: 545,
		note: 'A uniform 40% ratio on fair market value, with local homestead exemptions reducing the taxable base.',
		source: 'O.C.G.A. §48-5-7'
	},
	{
		id: 'ny',
		label: 'New York — municipal',
		state: 'NY',
		assessmentRatio: 0.5,
		effectiveRate: [0.017, 0.028],
		reassessment: 'cyclical',
		appeal: { board: 'Board of assessment review, grievance day', deadline: 'Fourth Tuesday in May in most towns', filingFee: 0 },
		contestedShare: 0.5,
		medianAward: 580,
		note: 'Levels of assessment vary from 5% to 100% by municipality, and the state publishes an equalisation rate for each.',
		source: 'RPTL §523; ORPTS equalisation rates'
	},
	{
		id: 'md-montgomery',
		label: 'Maryland — Montgomery County',
		state: 'MD',
		assessmentRatio: 1,
		effectiveRate: [0.0095, 0.011],
		reassessment: 'cyclical',
		taxCap: { rate: 0.1, basis: 'Homestead tax credit, 10% cap on taxable assessment growth' },
		appeal: { board: 'Supervisor of Assessments, then the Property Tax Assessment Appeals Board', deadline: '45 days from the notice', filingFee: 0 },
		contestedShare: 0.45,
		medianAward: 540,
		note: 'Triennial reassessment in groups; the county rate is set annually on top of the state rate.',
		source: 'Tax-Property Article §8-104; SDAT notices'
	}
];

export const DEFAULT_JURISDICTION = 'md-montgomery';

export const jurisdictionById = (id: string) => JURISDICTIONS.find((item) => item.id === id);

/** Midpoint effective rate — the default a page opens with, before the visitor overtypes it. */
export function defaultEffectiveRate(jurisdiction: Jurisdiction): number {
	return (jurisdiction.effectiveRate[0] + jurisdiction.effectiveRate[1]) / 2;
}

/**
 * Property tax on a given market value. The effective rate is published against market value, so the
 * ratio is not applied a second time — doing so would double-count it and halve the bill.
 */
export function annualTax(
	marketValue: number,
	jurisdiction: Jurisdiction,
	effectiveRate = defaultEffectiveRate(jurisdiction)
): number {
	return Math.max(0, marketValue) * effectiveRate;
}

/**
 * The market value a county is implying with a given assessed value. This is the conversion the
 * appeal audit runs in reverse: a Tennessee parcel assessed at $100,000 with a 25% ratio is a county
 * claim that the house is worth $400,000.
 */
export function impliedMarketValue(assessedValue: number, jurisdiction: Jurisdiction): number {
	const ratio = jurisdiction.assessmentRatio * (jurisdiction.equalization ?? 1);
	if (ratio <= 0) return 0;
	return Math.max(0, assessedValue) / ratio;
}
