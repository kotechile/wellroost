/**
 * Capital sinking fund.
 *
 * A house does not fail all at once, and it does not fail on a schedule. It fails on a hazard curve
 * that starts low, stays low for years, then climbs steeply — the wear-out branch of the bathtub
 * curve. A straight-line reserve ("1% of value a year") ignores both the shape and the age
 * distribution, which is why it underfunds an eighteen-year-old house and overfunds a new one.
 *
 * The model is a Weibull survival curve per component with shape k = 3. Two consequences are worth
 * stating plainly, because they bound how the output should be read:
 *
 * - The number is a planning envelope, not an actuarial estimate. `k` is exposed and editable, and the
 *   page says what it is. A different k changes the timing, not the total.
 * - The contribution is spread over the window the visitor chooses. A one-year window is a
 *   catch-up figure; a five-year window is a sustainable one. Both are printed, because the honest
 *   answer to "what should I save" depends on how much runway is left.
 */
import { HOUSEHOLD_COMPONENTS, componentById, midpointLife } from './data/components';

export interface ComponentInput {
	id: string;
	/** Age in years. Zero for new installations. */
	age: number;
	/** Replacement cost today. Defaults to the industry midpoint when the visitor has no quote. */
	replacementCost: number;
}

export interface SinkingFundInputs {
	components: ComponentInput[];
	horizonYears: number;
	/** Weibull shape. 1 is memoryless (exponential); 3 is a clear wear-out curve. */
	shape: number;
}

export interface ComponentProjection {
	id: string;
	label: string;
	age: number;
	life: number;
	replacementCost: number;
	/** Share of expected life already consumed. */
	lifeUsed: number;
	/** Probability of failure inside the chosen window, conditional on surviving to today. */
	windowProbability: number;
	/** Expected cost inside the window: replacement cost × window probability. */
	expectedCost: number;
	/** Median remaining life in years, or null when the component is already past its midpoint. */
	medianRemaining: number | null;
}

export interface SinkingFundResult {
	rows: ComponentProjection[];
	monthly: number;
	horizonTotal: number;
	expectedFailures: number;
	/** The next three failures by median date, soonest first. */
	next: Array<{ label: string; yearsAway: number; cost: number }>;
	/** Interest cost of borrowing the same money on an 18-month card at 24.99%. */
	debtInterest: number;
	shape: number;
}

/** Weibull CDF: probability of failure by age x, given characteristic life λ. */
export function weibullFailure(ageYears: number, lifeYears: number, shape: number): number {
	if (ageYears <= 0) return 0;
	const lambda = Math.max(0.5, lifeYears);
	return 1 - Math.exp(-Math.pow(ageYears / lambda, shape));
}

/** Conditional probability of failing inside the window, given survival to the current age. */
export function windowProbability(
	age: number,
	life: number,
	windowYears: number,
	shape: number
): number {
	const survived = 1 - weibullFailure(age, life, shape);
	if (survived <= 1e-9) return 1;
	const byEnd = weibullFailure(age + Math.max(0, windowYears), life, shape);
	return Math.min(1, Math.max(0, (byEnd - (1 - survived)) / survived));
}

/** Median age at failure: λ × (ln 2)^(1/k). */
export function medianLife(life: number, shape: number): number {
	return Math.max(0.5, life) * Math.pow(Math.log(2), 1 / shape);
}

/** Monthly contribution across the whole house for a given window. Shared with the TCO engine. */
export function reserveMonthly(components: ComponentInput[], horizonYears: number, shape = 3): number {
	const result = runSinkingFund({ components, horizonYears, shape });
	return result.monthly;
}

const CARD_RATE = 0.2499;
const CARD_MONTHS = 18;

export function runSinkingFund(input: SinkingFundInputs): SinkingFundResult {
	const windowYears = Math.max(0.25, input.horizonYears);
	const shape = Math.max(0.5, input.shape);

	const rows: ComponentProjection[] = input.components
		.map((entry) => {
			const definition = componentById(entry.id);
			if (!definition) return null;
			const life = midpointLife(definition);
			const cost = Math.max(0, entry.replacementCost);
			const probability = windowProbability(entry.age, life, windowYears, shape);
			const medianAt = medianLife(life, shape);
			return {
				id: entry.id,
				label: definition.label,
				age: entry.age,
				life,
				replacementCost: cost,
				lifeUsed: Math.min(1.5, Math.max(0, entry.age / life)),
				windowProbability: probability,
				expectedCost: cost * probability,
				medianRemaining: medianAt > entry.age ? medianAt - entry.age : null
			};
		})
		.filter((row): row is ComponentProjection => row !== null);

	const horizonTotal = rows.reduce((sum, row) => sum + row.expectedCost, 0);
	const monthly = horizonTotal / (windowYears * 12);

	const next = rows
		.filter((row) => row.medianRemaining !== null)
		.sort((a, b) => (a.medianRemaining ?? 0) - (b.medianRemaining ?? 0))
		.slice(0, 3)
		.map((row) => ({ label: row.label, yearsAway: row.medianRemaining ?? 0, cost: row.replacementCost }));

	const rate = CARD_RATE / 12;
	const payment = rate > 0 ? (horizonTotal * rate) / (1 - Math.pow(1 + rate, -CARD_MONTHS)) : horizonTotal / CARD_MONTHS;
	const debtInterest = Math.max(0, payment * CARD_MONTHS - horizonTotal);

	return {
		rows,
		monthly,
		horizonTotal,
		expectedFailures: rows.reduce((sum, row) => sum + row.windowProbability, 0),
		next,
		debtInterest,
		shape
	};
}

/** Default component set: every system in the table, with plausible ages for a 1998 house. */
export function defaultComponents(): ComponentInput[] {
	return HOUSEHOLD_COMPONENTS.map((definition, index) => ({
		id: definition.id,
		age: [18, 12, 6, 9, 17, 4, 11][index] ?? 10,
		replacementCost: Math.round((definition.cost[0] + definition.cost[1]) / 2)
	}));
}
