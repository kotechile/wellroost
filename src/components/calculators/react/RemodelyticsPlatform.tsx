import { useId, useMemo, useState, type ReactNode } from 'react';

import { calculateRemodelytics } from '../../../lib/calculators/remodelytics';
import { formatCurrency } from '../../../lib/calculators/format';
// Temporarily hidden: Property lookup adapter and panel imports
// import { fetchPropertyContext } from '../../../lib/remodelytics/adapters/property';
// import { fetchValuationContext } from '../../../lib/remodelytics/adapters/valuation';
import { mergeRemodelyticsInputs } from '../../../lib/remodelytics/merge';
import type { RemodelyticsOverrides } from '../../../lib/remodelytics/types';
import type {
	RemodelyticsEngine,
	RemodelyticsInputs,
	RemodelyticsMaterialTier,
	RemodelyticsProjectType
} from '../../../lib/calculators/types';
// import AddressLookupPanel from './AddressLookupPanel';

const INITIAL_INPUTS: RemodelyticsInputs = {
	engine: 'resale',
	projectType: 'kitchen',
	materialTier: 'enhanced',
	zipCode: '33139',
	homeValue: 625000,
	homeSize: 1850,
	projectCostBaseline: 58000,
	cityCostIndex: 112,
	baselineCostIndex: 100,
	currentValue: 625000,
	compAverageValue: 712000,
	purchasePrice: 590000,
	mortgageLoanAmount: 545000,
	mortgageBalance: 418000,
	proposedHelocAmount: 65000,
	grossMonthlyRent: 2600,
	monthlyOperatingExpenses: 560,
	monthlyDebtService: 1320,
	initialCashOutlay: 82000,
	baselineMonthlyUtilityCost: 285,
	currentEfficiency: 10,
	proposedEfficiency: 17,
	utilityInflationRate: 3,
	discountRate: 6,
	householdIncome: 92000,
	localAmi: 104000,
	energyReductionPercent: 24,
	dtiPercent: 43,
	diyPercentOfArv: 4,
	greenPremiumPercent: 1.2
};

const ENGINE_LABELS: Record<RemodelyticsEngine, string> = {
	resale: 'Resale',
	energy: 'Energy',
	income: 'Income',
	risk: 'Risk',
	underwriting: 'LTV'
};

const PROJECT_OPTIONS: Array<{ value: RemodelyticsProjectType; label: string }> = [
	{ value: 'kitchen', label: 'Kitchen remodel' },
	{ value: 'bathroom', label: 'Bathroom remodel' },
	{ value: 'siding', label: 'Siding replacement' },
	{ value: 'deck', label: 'Deck addition' },
	{ value: 'garage-door', label: 'Garage door' },
	{ value: 'hvac', label: 'HVAC / heat pump' },
	{ value: 'solar', label: 'Solar array' },
	{ value: 'adu', label: 'Detached ADU' },
	{ value: 'basement-rental', label: 'Basement rental' }
];

const MATERIAL_OPTIONS: Array<{ value: RemodelyticsMaterialTier; label: string }> = [
	{ value: 'standard', label: 'Standard' },
	{ value: 'enhanced', label: 'Enhanced' },
	{ value: 'intricate', label: 'Intricate' }
];

const INITIAL_ADDRESS = '1234 palm ave, miami beach, fl 33139';

const ACRONYM_HELP = {
	AMI: 'Area Median Income: the local midpoint household income used for program eligibility.',
	ARV: 'After-Repair Value: the estimated home value after the renovation is completed.',
	AVM: 'Automated Valuation Model: a computer-generated property value estimate.',
	CCI: 'City Cost Index: a multiplier used to localize national construction costs.',
	CLTV: 'Combined Loan-to-Value: total debt secured by the home divided by the home value.',
	DTI: 'Debt-to-Income ratio: monthly debt payments divided by monthly income.',
	FHA: 'Federal Housing Administration: a government-backed mortgage program.',
	HEAR: 'High-Efficiency Electric Home Rebate program under the Inflation Reduction Act.',
	HELOC: 'Home Equity Line of Credit: a revolving loan secured by home equity.',
	HOMES: 'Home Owner Managing Energy Savings rebate program under the Inflation Reduction Act.',
	LTV: 'Loan-to-Value ratio: the loan amount divided by the home value.',
	MAO: 'Maximum Allowable Offer: the highest price an investor should pay before repairs.',
	NKBA: 'National Kitchen and Bath Association: used here as a remodeling budget guardrail reference.',
	NPV: 'Net Present Value: the value today of future savings after discounting.',
	ROI: 'Return on Investment: gain or loss relative to the amount spent.'
} as const;

interface AcronymProps {
	term: keyof typeof ACRONYM_HELP;
	children?: ReactNode;
}

function Acronym({ term, children }: AcronymProps) {
	return (
		<abbr
			title={ACRONYM_HELP[term]}
			className="cursor-help decoration-dotted underline-offset-4"
			style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}
		>
			{children ?? term}
		</abbr>
	);
}

function formatNumber(value: number, suffix = '') {
	return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
		Number.isFinite(value) ? value : 0
	)}${suffix}`;
}

function getRiskTone(risk: 'Low' | 'Moderate' | 'High') {
	if (risk === 'High') {
		return 'border-rose-200 bg-rose-50 text-rose-800 font-semibold';
	}

	if (risk === 'Moderate') {
		return 'border-amber-200 bg-amber-50 text-amber-800 font-semibold';
	}

	return 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold';
}

interface NumberFieldProps {
	id: string;
	label: ReactNode;
	value: number;
	prefix?: string;
	suffix?: string;
	step?: number;
	helpText: ReactNode;
	onChange: (value: number) => void;
}

function NumberField({
	id,
	label,
	value,
	prefix,
	suffix,
	step = 1,
	helpText,
	onChange
}: NumberFieldProps) {
	return (
		<label
			htmlFor={id}
			className="grid min-w-0 gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs transition hover:border-gray-300"
		>
			<span className="text-sm font-semibold tracking-wide text-gray-900">{label}</span>
			<div className="relative min-w-0">
				{prefix ? (
					<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium text-gray-400">
						{prefix}
					</span>
				) : null}
				<input
					id={id}
					type="number"
					inputMode="decimal"
					step={step}
					value={value}
					onChange={(event) => onChange(Number(event.target.value))}
					className={[
						'w-full min-w-0 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold tabular-nums text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 sm:text-base',
						prefix ? 'pl-10' : 'pl-4',
						suffix ? 'pr-14' : 'pr-4'
					].join(' ')}
				/>
				{suffix ? (
					<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-gray-500">
						{suffix}
					</span>
				) : null}
			</div>
			<span className="text-xs leading-5 text-gray-500">{helpText}</span>
		</label>
	);
}

interface MetricCardProps {
	label: ReactNode;
	value: string;
	detail: ReactNode;
	tone?: 'cyan' | 'emerald' | 'amber' | 'rose';
}

function MetricCard({ label, value, detail, tone = 'cyan' }: MetricCardProps) {
	const toneClass = {
		cyan: 'text-blue-950 border-blue-200 bg-blue-50/50 shadow-xs',
		emerald: 'text-emerald-950 border-emerald-200 bg-emerald-50/50 shadow-xs',
		amber: 'text-amber-950 border-amber-200 bg-amber-50/50 shadow-xs',
		rose: 'text-rose-950 border-rose-200 bg-rose-50/50 shadow-xs'
	}[tone];

	return (
		<div className={`min-w-0 overflow-hidden rounded-2xl border p-4 ${toneClass}`}>
			<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-medium text-gray-500">{label}</p>
			<p className="mt-2.5 text-[clamp(1.7rem,2.4vw,2.35rem)] leading-none font-bold tracking-tight tabular-nums text-gray-1000">
				{value}
			</p>
			<p className="mt-2 text-xs leading-5 text-gray-600">{detail}</p>
		</div>
	);
}

export default function RemodelyticsPlatform() {
	// Temporary hidden: Property lookup states (can be restored when connecting live data provider)
	// const [address, setAddress] = useState(INITIAL_ADDRESS);
	// const [fetchedContext, setFetchedContext] = useState<any>(null);
	// const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
	// const [lookupMessage, setLookupMessage] = useState<string | null>(null);
	const [overrides, setOverrides] = useState<RemodelyticsOverrides>({});
	const [copied, setCopied] = useState(false);
	const fieldId = useId();
	const inputs = useMemo(
		() => mergeRemodelyticsInputs(INITIAL_INPUTS, null, overrides),
		[overrides]
	);
	const breakdown = useMemo(() => calculateRemodelytics(inputs), [inputs]);

	/*
	const runPropertyLookup = async (nextAddress = address, nextProjectType = inputs.projectType) => {
		const normalizedAddress = nextAddress.trim();

		if (!normalizedAddress) {
			setLookupStatus('error');
			setLookupMessage('Enter an address before loading property context.');
			return;
		}

		setLookupStatus('loading');
		setLookupMessage('Looking up property facts and valuation context...');

		try {
			const propertyResult = await fetchPropertyContext({ address: normalizedAddress });
			const valuationResult = await fetchValuationContext({
				address: normalizedAddress,
				projectType: nextProjectType,
				currentValue: propertyResult.property.currentValue?.value
			});

			setFetchedContext({
				property: propertyResult.property,
				valuation: valuationResult.valuation
			});
			setLookupStatus('loaded');
			setLookupMessage('Property context loaded. You can now review and override the fetched values.');
		} catch (error) {
			setLookupStatus('error');
			setLookupMessage(
				error instanceof Error
					? error.message
					: 'Property lookup failed. You can continue with manual assumptions.'
			);
		}
	};
	*/

	const updateInput = <K extends keyof RemodelyticsInputs>(key: K, value: RemodelyticsInputs[K]) => {
		setOverrides((current) => ({ ...current, [key]: value }));

		/*
		if (key === 'projectType' && fetchedContext?.property?.address?.value) {
			void runPropertyLookup(fetchedContext.property.address.value, value as RemodelyticsProjectType);
		}
		*/
	};

	const exportPacket = async () => {
		const packet = {
			tool: 'Remodelytics underwriting packet',
			property: {
				address: INITIAL_ADDRESS,
				zipCode: inputs.zipCode,
				homeValue: inputs.homeValue,
				homeSize: inputs.homeSize,
				projectType: inputs.projectType,
				materialTier: inputs.materialTier
			},
			results: breakdown,
			greenAddendumMap: {
				currentEfficiency: inputs.currentEfficiency,
				proposedEfficiency: inputs.proposedEfficiency,
				energyReductionPercent: inputs.energyReductionPercent,
				monthlyUtilitySavingsYearOne: breakdown.monthlyUtilitySavingsYearOne,
				greenPremiumValue: breakdown.greenPremiumValue
			}
		};

		await navigator.clipboard?.writeText(JSON.stringify(packet, null, 2));
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	};

	return (
		<div className="grid gap-6">
			{/* Temporary hidden: Property lookup panel
			<AddressLookupPanel
				address={address}
				status={lookupStatus}
				message={lookupMessage}
				context={fetchedContext}
				onAddressChange={setAddress}
				onLookup={() => void runPropertyLookup()}
			/>
			*/}

			<div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-slate-50/50 to-white shadow-sm">
				<div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:px-7">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
							Multi-engine platform
						</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-1000 sm:text-4xl">
							Model the remodel like an underwriter, investor, and homeowner at once
						</h2>
						<p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">
							Segment a renovation across resale lift, energy <Acronym term="NPV" />, income potential, over-improvement
							guardrails, and loan leverage. Values are live-calculated from your assumptions and ready
							for pressure testing.
						</p>
						<div className="mt-6 flex flex-wrap gap-3" role="tablist" aria-label="Remodelytics engines">
							{(Object.keys(ENGINE_LABELS) as RemodelyticsEngine[]).map((engine) => (
								<button
									key={engine}
									type="button"
									role="tab"
									aria-selected={inputs.engine === engine}
									onClick={() => updateInput('engine', engine)}
									className={[
										'rounded-full border px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.22em] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer',
										inputs.engine === engine
											? 'border-blue-600 bg-blue-600 text-white shadow-xs'
											: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
									].join(' ')}
								>
									{ENGINE_LABELS[engine]}
								</button>
							))}
						</div>
					</div>
					<div className="grid content-between gap-4 rounded-2xl border border-gray-200/80 bg-white/95 p-5 shadow-xs">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
									Selected project
								</p>
								<p className="mt-2 text-2xl font-bold text-gray-900">
									{PROJECT_OPTIONS.find((option) => option.value === inputs.projectType)?.label}
								</p>
							</div>
							<span
								className={`rounded-full border px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] ${getRiskTone(
									breakdown.overImprovementRisk
								)}`}
							>
								{breakdown.overImprovementRisk} risk
							</span>
						</div>
						<div className="grid grid-cols-1 gap-3">
							<MetricCard
								label="Local cost"
								value={formatCurrency(breakdown.localProjectCost)}
								detail={<><Acronym term="CCI" />-adjusted scope</>}
							/>
							<MetricCard
								label={<Acronym term="ARV" />}
								value={formatCurrency(Math.max(breakdown.arvProfessional, breakdown.arvSeventyRule))}
								detail="Comp / 70% blend"
								tone="emerald"
							/>
							<MetricCard
								label={<Acronym term="MAO" />}
								value={formatCurrency(breakdown.mao)}
								detail="Investor ceiling"
								tone="amber"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<label className="grid min-w-0 gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs transition hover:border-gray-300">
					<span className="text-sm font-semibold tracking-wide text-gray-900">Project type</span>
					<select
						value={inputs.projectType}
						onChange={(event) =>
							updateInput('projectType', event.target.value as RemodelyticsProjectType)
						}
						className="min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 sm:text-base"
					>
						{PROJECT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<span className="text-xs leading-5 text-gray-500">Routes the remodel into the best-fit engine.</span>
				</label>
				<label className="grid min-w-0 gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs transition hover:border-gray-300">
					<span className="text-sm font-semibold tracking-wide text-gray-900">Material tier</span>
					<select
						value={inputs.materialTier}
						onChange={(event) =>
							updateInput('materialTier', event.target.value as RemodelyticsMaterialTier)
						}
						className="min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 sm:text-base"
					>
						{MATERIAL_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<span className="text-xs leading-5 text-gray-500">Applies a proxy finish-grade multiplier.</span>
				</label>
				<label
					htmlFor={`${fieldId}-zip`}
					className="grid min-w-0 gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs transition hover:border-gray-300"
				>
					<span className="text-sm font-semibold tracking-wide text-gray-900">ZIP code</span>
					<input
						id={`${fieldId}-zip`}
						value={inputs.zipCode}
						onChange={(event) => updateInput('zipCode', event.target.value)}
						className="min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 sm:text-base"
					/>
					<span className="text-xs leading-5 text-gray-500">
						Placeholder for RSMeans, <Acronym term="AVM" />, <Acronym term="AMI" />, and DSIRE lookups.
					</span>
				</label>
				<NumberField
					id={`${fieldId}-home-value`}
					label="Home value"
					prefix="$"
					step={5000}
					value={inputs.homeValue}
					onChange={(value) => updateInput('homeValue', value)}
					helpText="Baseline property value used for NKBA and green-premium checks."
				/>
			</div>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
				<NumberField
					id={`${fieldId}-baseline-cost`}
					label="National baseline cost"
					prefix="$"
					step={1000}
					value={inputs.projectCostBaseline}
					onChange={(value) => updateInput('projectCostBaseline', value)}
					helpText="Generic model before localization."
				/>
				<NumberField
					id={`${fieldId}-cci-local`}
					label={<>Local <Acronym term="CCI" /></>}
					value={inputs.cityCostIndex}
					step={1}
					onChange={(value) => updateInput('cityCostIndex', value)}
					helpText="Proxy city cost index."
				/>
				<NumberField
					id={`${fieldId}-comp-average`}
					label={<>Comp average <Acronym term="ARV" /></>}
					prefix="$"
					step={5000}
					value={inputs.compAverageValue}
					onChange={(value) => updateInput('compAverageValue', value)}
					helpText="As-completed comp sale average."
				/>
				<NumberField
					id={`${fieldId}-green-premium`}
					label="Green premium"
					suffix="%"
					step={0.1}
					value={inputs.greenPremiumPercent}
					onChange={(value) => updateInput('greenPremiumPercent', value)}
					helpText="Property appreciation modifier for verified energy upgrades."
				/>
			</div>

			<div className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
							Engine output
						</p>
						<h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-1000">
							{ENGINE_LABELS[inputs.engine]} analytics
						</h3>
					</div>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={exportPacket}
							className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
						>
							{copied ? 'Packet copied' : 'Copy underwriting packet'}
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
						>
							Print / save PDF
						</button>
					</div>
				</div>

				<div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
					<MetricCard
						label="Resale lift"
						value={formatCurrency(breakdown.immediateAppreciation)}
						detail={<>{formatNumber(breakdown.pointInTimeRoi, '%')} point-in-time <Acronym term="ROI" /></>}
					/>
					<MetricCard
						label={<>Energy <Acronym term="NPV" /></>}
						value={formatCurrency(breakdown.energyNpv)}
						detail={`${formatCurrency(breakdown.monthlyUtilitySavingsYearOne)} estimated monthly savings`}
						tone={breakdown.energyNpv >= 0 ? 'emerald' : 'rose'}
					/>
					<MetricCard
						label="Income value"
						value={formatCurrency(breakdown.capitalizedIncomeValue)}
						detail={`${formatNumber(breakdown.cashOnCashRoi, '%')} cash-on-cash return`}
						tone="amber"
					/>
					<MetricCard
						label="Leverage"
						value={`${formatNumber(breakdown.purchaseLtv, '%')} LTV`}
						detail={<><Acronym term="CLTV" /> {formatNumber(breakdown.cltv, '%')} after proposed <Acronym term="HELOC" /></>}
						tone={breakdown.purchaseLtv > 97 || breakdown.cltv > 90 ? 'rose' : 'emerald'}
					/>
				</div>

				<div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
					<div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 shadow-xs">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
							Engine confidence map
						</p>
						<div className="mt-5 grid gap-4">
							{(Object.keys(breakdown.engineScores) as RemodelyticsEngine[]).map((engine) => (
								<div key={engine} className="grid gap-2">
									<div className="flex items-center justify-between gap-3">
										<span className="text-sm font-semibold text-gray-800">{ENGINE_LABELS[engine]}</span>
										<span className="font-mono text-xs font-bold text-blue-700">
											{Math.round(breakdown.engineScores[engine])}
										</span>
									</div>
									<div className="h-2 rounded-full bg-gray-200">
										<div
											className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
											style={{ width: `${Math.min(breakdown.engineScores[engine], 100)}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 shadow-xs">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
							Safeguards and underwriting flags
						</p>
						<div className="mt-4 grid gap-3">
							<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
								<div className="flex items-center justify-between gap-4">
									<p className="text-sm font-semibold text-gray-900"><Acronym term="NKBA" /> budget warning meter</p>
									<span className={`rounded-full border px-3 py-1 text-xs ${getRiskTone(breakdown.overImprovementRisk)}`}>
										{formatNumber(breakdown.nkbaSpendRatio, '%')}
									</span>
								</div>
								<div className="mt-3 h-2 rounded-full bg-gray-200">
									<div
										className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
										style={{ width: `${Math.min(Math.max(breakdown.nkbaSpendRatio * 4, 8), 100)}%` }}
									/>
								</div>
							</div>
							{breakdown.underwritingWarnings.length ? (
								breakdown.underwritingWarnings.map((warning) => (
									<p
										key={warning}
										className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 font-medium"
									>
										{warning}
									</p>
								))
							) : (
								<p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 font-medium">
									No underwriting stress warnings triggered by the current assumptions.
								</p>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
				<NumberField
					id={`${fieldId}-income`}
					label="Household income"
					prefix="$"
					step={1000}
					value={inputs.householdIncome}
					onChange={(value) => updateInput('householdIncome', value)}
					helpText={<>Used for <Acronym term="HEAR" />/<Acronym term="HOMES" /> <Acronym term="AMI" /> bands.</>}
				/>
				<NumberField
					id={`${fieldId}-ami`}
					label={<>Local <Acronym term="AMI" /></>}
					prefix="$"
					step={1000}
					value={inputs.localAmi}
					onChange={(value) => updateInput('localAmi', value)}
					helpText={<>HUD <Acronym term="AMI" /> placeholder until API integration.</>}
				/>
				<NumberField
					id={`${fieldId}-reduction`}
					label="Energy reduction"
					suffix="%"
					step={1}
					value={inputs.energyReductionPercent}
					onChange={(value) => updateInput('energyReductionPercent', value)}
					helpText="Modeled whole-home energy reduction."
				/>
				<NumberField
					id={`${fieldId}-dti`}
					label={<>Debt-to-income (<Acronym term="DTI" />)</>}
					suffix="%"
					step={1}
					value={inputs.dtiPercent}
					onChange={(value) => updateInput('dtiPercent', value)}
					helpText={<>Underwriting stress check using <Acronym term="DTI" />.</>}
				/>
			</div>

			<div className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
							Underwriting assumptions
						</p>
						<h3 className="mt-2 text-xl font-bold text-gray-1000">As-completed valuation and leverage</h3>
					</div>
					<span className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] font-medium text-gray-600">
						<Acronym term="FHA" /> / HomeStyle / <Acronym term="HELOC" /> stress
					</span>
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
					<NumberField
						id={`${fieldId}-current-value`}
						label="Current value"
						prefix="$"
						step={5000}
						value={inputs.currentValue}
						onChange={(value) => updateInput('currentValue', value)}
						helpText={<>Current <Acronym term="AVM" /> or appraisal baseline.</>}
					/>
					<NumberField
						id={`${fieldId}-purchase-price`}
						label="Purchase price"
						prefix="$"
						step={5000}
						value={inputs.purchasePrice}
						onChange={(value) => updateInput('purchasePrice', value)}
						helpText={<>Purchase basis for lesser-of <Acronym term="LTV" />.</>}
					/>
					<NumberField
						id={`${fieldId}-loan`}
						label="Mortgage loan"
						prefix="$"
						step={5000}
						value={inputs.mortgageLoanAmount}
						onChange={(value) => updateInput('mortgageLoanAmount', value)}
						helpText={<>Proposed loan amount for <Acronym term="LTV" /> tests.</>}
					/>
					<NumberField
						id={`${fieldId}-heloc`}
						label={<>Proposed <Acronym term="HELOC" /></>}
						prefix="$"
						step={1000}
						value={inputs.proposedHelocAmount}
						onChange={(value) => updateInput('proposedHelocAmount', value)}
						helpText={<>Additional lien amount for <Acronym term="CLTV" />.</>}
					/>
					<NumberField
						id={`${fieldId}-mortgage-balance`}
						label="Mortgage balance"
						prefix="$"
						step={5000}
						value={inputs.mortgageBalance}
						onChange={(value) => updateInput('mortgageBalance', value)}
						helpText={<>Existing mortgage balance for <Acronym term="CLTV" />.</>}
					/>
				</div>
			</div>

			<div className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-emerald-800">
							Income and energy assumptions
						</p>
						<h3 className="mt-2 text-xl font-bold text-gray-1000">ADU cash flow and green appraisal inputs</h3>
					</div>
					<span className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] font-medium text-gray-600">
						30-year lifecycle
					</span>
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
					<NumberField
						id={`${fieldId}-rent`}
						label="Gross monthly rent"
						prefix="$"
						step={100}
						value={inputs.grossMonthlyRent}
						onChange={(value) => updateInput('grossMonthlyRent', value)}
						helpText="Projected rental income from ADU or conversion."
					/>
					<NumberField
						id={`${fieldId}-opex`}
						label="Operating expenses"
						prefix="$"
						step={50}
						value={inputs.monthlyOperatingExpenses}
						onChange={(value) => updateInput('monthlyOperatingExpenses', value)}
						helpText="Monthly expenses before debt service."
					/>
					<NumberField
						id={`${fieldId}-debt-service`}
						label="Debt service"
						prefix="$"
						step={50}
						value={inputs.monthlyDebtService}
						onChange={(value) => updateInput('monthlyDebtService', value)}
						helpText="Monthly financing cost."
					/>
					<NumberField
						id={`${fieldId}-cash-outlay`}
						label="Initial cash outlay"
						prefix="$"
						step={1000}
						value={inputs.initialCashOutlay}
						onChange={(value) => updateInput('initialCashOutlay', value)}
						helpText="Cash invested for cash-on-cash return."
					/>
					<NumberField
						id={`${fieldId}-utility`}
						label="Baseline utilities"
						prefix="$"
						step={10}
						value={inputs.baselineMonthlyUtilityCost}
						onChange={(value) => updateInput('baselineMonthlyUtilityCost', value)}
						helpText="Monthly energy spend before upgrades."
					/>
					<NumberField
						id={`${fieldId}-current-efficiency`}
						label="Current efficiency"
						value={inputs.currentEfficiency}
						step={0.5}
						onChange={(value) => updateInput('currentEfficiency', value)}
						helpText="Existing SEER, SEER2, AFUE, or comparable rating."
					/>
					<NumberField
						id={`${fieldId}-proposed-efficiency`}
						label="Proposed efficiency"
						value={inputs.proposedEfficiency}
						step={0.5}
						onChange={(value) => updateInput('proposedEfficiency', value)}
						helpText="New SEER, SEER2, AFUE, or comparable rating."
					/>
					<NumberField
						id={`${fieldId}-diy`}
						label={<>DIY share of <Acronym term="ARV" /></>}
						suffix="%"
						step={1}
						value={inputs.diyPercentOfArv}
						onChange={(value) => updateInput('diyPercentOfArv', value)}
						helpText="Flags owner-DIY renovation scopes above 10%."
					/>
					<NumberField
						id={`${fieldId}-inflation`}
						label="Utility inflation"
						suffix="%"
						step={0.25}
						value={inputs.utilityInflationRate}
						onChange={(value) => updateInput('utilityInflationRate', value)}
						helpText={<>Annual escalation used in savings <Acronym term="NPV" />.</>}
					/>
					<NumberField
						id={`${fieldId}-discount-rate`}
						label="Discount rate"
						suffix="%"
						step={0.25}
						value={inputs.discountRate}
						onChange={(value) => updateInput('discountRate', value)}
						helpText="Discount rate for the 30-year lifecycle model."
					/>
				</div>
			</div>
		</div>
	);
}
