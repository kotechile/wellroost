import { useId, useState } from 'react';

import { calculateBasicRemodeling } from '../../../lib/calculators/basicRemodeling';
import { formatCurrency, formatPercent } from '../../../lib/calculators/format';
import type {
	BasicProjectType,
	BasicRemodelingInputs,
	EnjoymentLevel
} from '../../../lib/calculators/basicRemodelingTypes';
import { CurrencyInput } from './fields/CurrencyInput';
import { StepperInput } from './fields/StepperInput';

const INITIAL_INPUTS: BasicRemodelingInputs = {
	projectType: 'kitchen',
	projectCost: 45000,
	estimatedResaleLift: 30000,
	yearsStaying: 7,
	enjoymentLevel: 'high',
	maintenanceSavingsAnnual: 1200
};

const PROJECT_OPTIONS: Array<{ value: BasicProjectType; label: string; hint: string }> = [
	{ value: 'kitchen', label: 'Kitchen remodel', hint: 'Big lifestyle impact, mixed recovery.' },
	{ value: 'bathroom', label: 'Bathroom remodel', hint: 'Usually steady but not spectacular recovery.' },
	{ value: 'windows-insulation', label: 'Windows / insulation', hint: 'Comfort and utility savings first.' },
	{ value: 'hvac', label: 'HVAC / heat pump', hint: 'Often more practical than flashy.' },
	{ value: 'solar', label: 'Solar', hint: 'Longer-horizon decision with utility upside.' },
	{ value: 'deck-patio', label: 'Deck / patio', hint: 'Lifestyle-heavy, moderate resale help.' },
	{ value: 'curb-appeal', label: 'Curb appeal exterior', hint: 'Often supports resale and listing appeal.' },
	{ value: 'flooring-paint', label: 'Flooring / paint', hint: 'Usually lower scope and easier to justify.' },
	{ value: 'other', label: 'Other', hint: 'Use when the project does not fit a preset.' }
];

const ENJOYMENT_OPTIONS: Array<{
	value: EnjoymentLevel;
	label: string;
	shortLabel: string;
	description: string;
}> = [
	{
		value: 'very-low',
		label: 'Very low',
		shortLabel: 'Very low',
		description: 'Mostly a practical fix, not something you care much about day to day.'
	},
	{
		value: 'low',
		label: 'Low',
		shortLabel: 'Low',
		description: 'Some benefit, but not enough to drive the decision by itself.'
	},
	{
		value: 'medium',
		label: 'Medium',
		shortLabel: 'Medium',
		description: 'Useful and pleasant, but not a dream-upgrade situation.'
	},
	{
		value: 'high',
		label: 'High',
		shortLabel: 'High',
		description: 'This would noticeably improve daily life while you live there.'
	},
	{
		value: 'very-high',
		label: 'Very high',
		shortLabel: 'Very high',
		description: 'This is a meaningful quality-of-life project, not just a financial one.'
	}
];

function formatRatioAsPercent(ratio: number) {
	return formatPercent(Math.round(ratio * 100));
}

function getRecommendationLabel(recommendation: ReturnType<typeof calculateBasicRemodeling>['recommendation']) {
	if (recommendation === 'worth-it') {
		return 'Worth it';
	}

	if (recommendation === 'skip') {
		return 'Skip';
	}

	return 'Maybe';
}

function getRecommendationTone(recommendation: ReturnType<typeof calculateBasicRemodeling>['recommendation']) {
	if (recommendation === 'worth-it') {
		return 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs';
	}

	if (recommendation === 'skip') {
		return 'border-rose-200 bg-rose-50 text-rose-950 shadow-xs';
	}

	return 'border-amber-200 bg-amber-50 text-amber-950 shadow-xs';
}

function getRecommendationSupport(recommendation: ReturnType<typeof calculateBasicRemodeling>['recommendation']) {
	if (recommendation === 'worth-it') {
		return 'Strong enough on value, timeline, and day-to-day benefit to look like a smart move.';
	}

	if (recommendation === 'skip') {
		return 'The cost is doing more work than the likely recovery, savings, and enjoyment.';
	}

	return 'This can make sense, but it depends on how realistic your assumptions are and how much you value the upgrade.';
}

export default function BasicRemodelingCalculator() {
	const [inputs, setInputs] = useState(INITIAL_INPUTS);
	const fieldId = useId();
	const breakdown = calculateBasicRemodeling(inputs);
	const selectedEnjoyment =
		ENJOYMENT_OPTIONS.find((option) => option.value === inputs.enjoymentLevel) ?? ENJOYMENT_OPTIONS[2];

	const updateInput = <K extends keyof BasicRemodelingInputs>(
		key: K,
		value: BasicRemodelingInputs[K]
	) => {
		setInputs((current) => ({ ...current, [key]: value }));
	};

	return (
		<div className="grid gap-6">
			<div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-slate-50/50 to-white shadow-sm">
				<div className="grid gap-6 px-6 py-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] 2xl:px-7">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
							Quick homeowner decision
						</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-1000 sm:text-4xl">
							Get to a real answer without building a spreadsheet
						</h2>
						<p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">
							Use six simple inputs to estimate whether a remodel looks financially sensible,
							mostly personal, or hard to justify. This version is built for speed, not underwriting.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<div className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] font-medium text-gray-700 shadow-xs">
								Fast inputs
							</div>
							<div className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] font-medium text-gray-700 shadow-xs">
								Plain-language result
							</div>
							<div className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] font-medium text-gray-700 shadow-xs">
								Stay-horizon logic
							</div>
						</div>
					</div>

					<div className={`rounded-2xl border p-5 ${getRecommendationTone(breakdown.recommendation)}`}>
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-semibold text-current/70">
							Recommendation
						</p>
						<h3 className="mt-3 text-4xl font-bold tracking-tight">
							{getRecommendationLabel(breakdown.recommendation)}
						</h3>
						<p className="mt-3 text-sm leading-7 text-current/90 font-medium">
							{getRecommendationSupport(breakdown.recommendation)}
						</p>

						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-gray-200/80 bg-white/90 p-4 shadow-xs">
								<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-medium text-gray-500">
									Decision score
								</p>
								<p className="mt-2 text-2xl font-bold text-gray-1000 tabular-nums">
									{Math.round(breakdown.decisionScore)}/100
								</p>
							</div>
							<div className="rounded-xl border border-gray-200/80 bg-white/90 p-4 shadow-xs">
								<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-medium text-gray-500">
									Value during stay
								</p>
								<p className="mt-2 text-2xl font-bold text-gray-1000 tabular-nums">
									{formatCurrency(breakdown.netValue)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-6">
				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
								Project setup
							</p>
							<h3 className="mt-2 text-xl font-bold text-gray-1000">
								Start with the remodel and your timeline
							</h3>
						</div>
						<div className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] font-medium text-gray-600">
							6 inputs only
						</div>
					</div>

					<div className="mt-6 grid gap-5">
						<div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] font-medium text-gray-500">
										Core input
									</p>
									<span className="mt-1 block text-sm font-semibold tracking-wide text-gray-900">
										Project type
									</span>
								</div>
								<span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.2em] font-semibold text-blue-700">
									Use case
								</span>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{PROJECT_OPTIONS.map((option) => {
									const active = inputs.projectType === option.value;

									return (
										<button
											key={option.value}
											type="button"
											onClick={() => updateInput('projectType', option.value)}
											className={[
												'rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer',
												active
													? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
													: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
											].join(' ')}
										>
											<p className={`text-sm font-semibold ${active ? 'text-blue-950 font-bold' : 'text-gray-900'}`}>{option.label}</p>
											<p className={`mt-1.5 text-xs leading-5 ${active ? 'text-blue-800' : 'text-gray-500'}`}>{option.hint}</p>
										</button>
									);
								})}
							</div>
						</div>

						<div className="grid gap-5 md:grid-cols-2">
							<CurrencyInput
								id={`${fieldId}-project-cost`}
								eyebrow="Core input"
								label="Project cost"
								value={inputs.projectCost}
								step={1000}
								onChange={(value) => updateInput('projectCost', value)}
								helpText="Your expected all-in out-of-pocket cost."
							/>
							<CurrencyInput
								id={`${fieldId}-resale-lift`}
								eyebrow="Core input"
								label="Estimated resale lift"
								value={inputs.estimatedResaleLift}
								step={1000}
								onChange={(value) => updateInput('estimatedResaleLift', value)}
								helpText="How much extra home value you think this project adds if you sold after completion."
							/>
						</div>

						<div className="grid gap-5 md:grid-cols-2">
							<StepperInput
								id={`${fieldId}-years-staying`}
								eyebrow="Timeline"
								label="Years staying"
								value={inputs.yearsStaying}
								min={0}
								max={20}
								step={1}
								suffix="Years"
								onChange={(value) => updateInput('yearsStaying', value)}
								helpText="How long you realistically expect to stay in the home."
							/>
							<CurrencyInput
								id={`${fieldId}-maintenance-savings`}
								eyebrow="Savings"
								label="Maintenance savings"
								value={inputs.maintenanceSavingsAnnual}
								step={100}
								onChange={(value) => updateInput('maintenanceSavingsAnnual', value)}
								helpText="Annual repair, maintenance, or utility savings from the project."
							/>
						</div>

						<div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] font-medium text-gray-500">
										Lifestyle
									</p>
									<span className="mt-1 block text-sm font-semibold tracking-wide text-gray-900">
										Enjoyment value
									</span>
								</div>
								<span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.2em] font-semibold text-blue-700">
									Personal fit
								</span>
							</div>
							<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
								{ENJOYMENT_OPTIONS.map((option) => {
									const active = inputs.enjoymentLevel === option.value;

									return (
										<button
											key={option.value}
											type="button"
											onClick={() => updateInput('enjoymentLevel', option.value)}
											className={[
												'rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer',
												active
													? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
													: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
											].join(' ')}
										>
											<p className={`text-sm font-semibold ${active ? 'text-blue-950 font-bold' : 'text-gray-900'}`}>{option.shortLabel}</p>
										</button>
									);
								})}
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-4">
								<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-medium text-gray-500">
									Selected enjoyment level
								</p>
								<p className="mt-2 text-base font-bold text-gray-900">{selectedEnjoyment.label}</p>
								<p className="mt-1.5 text-sm leading-6 text-gray-600">
									{selectedEnjoyment.description}
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50/40 via-white to-gray-50/30 p-6 shadow-sm">
					<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
						Quick read
					</p>
					<div className="mt-5 grid gap-4 xl:grid-cols-3">
						<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
							<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
								Resale recovery
							</p>
							<p className="mt-3 text-3xl font-bold text-gray-1000 tabular-nums">
								{formatRatioAsPercent(breakdown.resaleRecovery)}
							</p>
							<p className="mt-2 text-xs leading-5 text-gray-500">
								How much of the project cost your resale estimate recovers.
							</p>
						</div>
						<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
							<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
								Simple payback
							</p>
							<p className="mt-3 text-3xl font-bold text-gray-1000 tabular-nums">
								{breakdown.paybackYears ? `${breakdown.paybackYears.toFixed(1)} years` : 'No clear payback'}
							</p>
							<p className="mt-2 text-xs leading-5 text-gray-500">
								Based on annual maintenance or utility savings only.
							</p>
						</div>
						<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
							<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
								Value during your stay
							</p>
							<p className="mt-3 text-3xl font-bold text-gray-1000 tabular-nums">
								{formatCurrency(breakdown.totalRealizedValue)}
							</p>
							<p className="mt-2 text-xs leading-5 text-gray-500">
								Resale lift, stay-period savings, and a conservative enjoyment credit combined.
							</p>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-gray-600">Decision notes</p>
					<div className="mt-5 grid gap-4 xl:grid-cols-3">
						{breakdown.decisionNotes.map((note) => (
							<div key={note} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
								<p className="text-sm leading-relaxed text-gray-700">{note}</p>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
					<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-amber-800">Method note</p>
					<p className="mt-2 text-sm leading-relaxed text-amber-950 font-medium">
						Basic is intentionally simple. It helps you pressure-test the decision quickly, but it
						does not use live comps, local cost feeds, incentives, or loan-program rules. That depth
						lives in Premium.
					</p>
				</div>
			</div>
		</div>
	);
}
