/**
 * Down payment assistance: the arithmetic, not a directory.
 *
 * There is no national feed of housing-finance-agency programs, and a table of fifty states built
 * from secondary sources would be stale within a quarter — the kind of dataset that quietly turns a
 * calculator into a liability. So this module carries what is stable and verifiable: that a program
 * exists, who runs it, and what form the assistance takes. Every dollar figure is an input on the
 * page, because the offer letter is the only authority on the offer.
 *
 * `verified` is deliberately false for every entry. A program's terms change with each funding
 * round; claiming otherwise would be worse than leaving the field blank.
 */
export interface DpaProgram {
	id: string;
	state: string;
	name: string;
	agency: string;
	url: string;
	/** How the assistance is delivered. */
	forms: Array<'deferred second' | 'forgivable second' | 'grant' | 'below-market first'>;
	/** What the reader has to bring to the page. */
	inputs: string[];
	note: string;
	verified: boolean;
}

export const DPA_PROGRAMS: DpaProgram[] = [
	{
		id: 'md-mmp',
		state: 'MD',
		name: 'Maryland Mortgage Program',
		agency: 'Maryland Department of Housing and Community Development',
		url: 'https://dhcd.maryland.gov/Pages/mmp/',
		forms: ['deferred second', 'forgivable second', 'below-market first'],
		inputs: ['assistance amount', 'form of assistance', 'first-lien rate', 'income limit at your household size'],
		note: 'Assistance usually arrives as a second lien paired with an agency first mortgage. The rate on that first lien is the number that decides whether the package is cheaper than a market loan with a smaller down payment.',
		verified: false
	}
];

export const programsForState = (state: string) => DPA_PROGRAMS.filter((program) => program.state === state);
export const coveredStates = () => [...new Set(DPA_PROGRAMS.map((program) => program.state))];
