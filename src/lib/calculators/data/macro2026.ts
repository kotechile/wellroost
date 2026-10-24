/**
 * The macro assumptions every 2026 engine defaults to, with the date each was true.
 *
 * Two rules, and both exist because the alternative is a page that states a stale number as fact:
 *
 * 1. Engines import from here. No component types a mortgage rate or a tax threshold into its own
 *    file, so re-dating the world is one edit and not a search.
 * 2. `asOf` is printed in the UI. A default that silently ages is a wrong answer wearing a right
 *    answer's clothes — the reader has no way to know the 7.32% on the screen is from October.
 *
 * Sources are recorded per row in `docs/tool-baseline-2026.md`; the short attribution here is what
 * a reviewer needs to re-check a figure without opening the doc.
 */

export const MACRO_2026 = {
	/** The day these figures were read. Printed beside every default the engines use. */
	asOf: '2026-10-24',

	/** Freddie Mac PMMS, 30-year fixed, week of 2026-10-22 (prior week 7.40%, year-ago 6.19%). */
	mortgageRate: 0.0732,
	/** FOMC target range after the 2026-09-16 25bp increase; 12–0, first hike since 2023. */
	fedFundsTarget: { low: 0.0375, high: 0.04 },

	/** FHFA conforming limits for 2026, one-unit. Recast and PMI eligibility turn on these. */
	conformingLimit: { baseline1Unit: 832750, highCostCeiling1Unit: 1249125 },

	/** NAR existing-home median, September 2026 release (2026-10-13). */
	medianExistingPrice: 417500,
	/** NAR months' supply, September 2026. */
	inventoryMonthsSupply: 4.8,

	tax: {
		/** IRS 2026 standard deduction. */
		standardDeductionSingle: 16100,
		standardDeductionJoint: 32200,
		/** OBBBA SALT cap for 2026; reverts to $10,000 in 2030. */
		saltCap: 40400,
		/** Cap phases down 30% of MAGI above this threshold, to a $10,000 floor. */
		saltPhaseoutThreshold: 505000,
		saltPhaseoutRate: 0.3,
		saltFloor: 10000,
		/** Deductible acquisition debt ceiling. */
		mortgageInterestCap: 750000,
		/** Long-run effective marginal rate assumed for a shield's cash value. Editable on every page. */
		marginalRate: 0.24
	},

	/** Second-lien floating rates, for the stress test's starting point. */
	helocRateBand: { low: 0.074, high: 0.082 },

	/** Round-trip friction on a sale: commission plus closing, taxes and concessions. */
	transactionFriction: { brokerCommission: 0.06, terminalRoundTrip: 0.07 },

	/** Home price growth band used by the outflow-parity ledger. */
	appreciationBand: { low: 0.01, high: 0.023 }
} as const;

export type Macro = typeof MACRO_2026;

/** Human-readable provenance for a default, printed next to it. */
export const MACRO_ATTRIBUTION = {
	mortgageRate: 'Freddie Mac PMMS, week of 22 Oct 2026',
	conformingLimit: 'FHFA 2026 limits',
	medianExistingPrice: 'NAR, September 2026',
	tax: 'IRS / OBBBA, tax year 2026',
	helocRateBand: 'Modelled range, not a quote',
	transactionFriction: 'Modelled range, not a quote'
} as const;
