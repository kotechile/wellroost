import { useId, useMemo, useState, type ReactNode } from 'react';

import { calculateRemodelytics } from '../../../lib/calculators/remodelytics';
import { formatCurrency } from '../../../lib/calculators/format';
import { fetchPropertyContext } from '../../../lib/remodelytics/adapters/property';
import { fetchValuationContext } from '../../../lib/remodelytics/adapters/valuation';
import { mergeRemodelyticsInputs } from '../../../lib/remodelytics/merge';
import type { RemodelyticsFetchedContext, RemodelyticsOverrides } from '../../../lib/remodelytics/types';
import type {
	RemodelyticsEngine,
	RemodelyticsInputs,
	RemodelyticsMaterialTier,
	RemodelyticsProjectType
} from '../../../lib/calculators/types';
import AddressLookupPanel from './AddressLookupPanel';

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
		return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
	}

	if (risk === 'Moderate') {
		return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
	}

	return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
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
			className="grid min-w-0 gap-3 rounded-[1.35rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
		>
			<span className="text-sm font-semibold tracking-wide text-slate-100">{label}</span>
			<div className="relative min-w-0">
				{prefix ? (
					<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
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
						'w-full min-w-0 rounded-[1rem] border border-slate-700/80 bg-slate-950/80 py-3 text-sm font-semibold tabular-nums text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:text-base',
						prefix ? 'pl-10' : 'pl-4',
						suffix ? 'pr-14' : 'pr-4'
					].join(' ')}
				/>
				{suffix ? (
					<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
						{suffix}
					</span>
				) : null}
			</div>
			<span className="text-xs leading-5 text-slate-500">{helpText}</span>
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
		cyan: 'text-cyan-100 border-cyan-500/20 shadow-[0_0_26px_rgba(34,211,238,0.08)]',
		emerald: 'text-emerald-200 border-emerald-500/20 shadow-[0_0_26px_rgba(16,185,129,0.08)]',
		amber: 'text-amber-100 border-amber-500/20 shadow-[0_0_26px_rgba(245,158,11,0.08)]',
		rose: 'text-rose-100 border-rose-500/20 shadow-[0_0_26px_rgba(244,63,94,0.08)]'
	}[tone];

	return (
		<div className={`min-w-0 overflow-hidden rounded-[1.35rem] border bg-slate-950/55 p-4 ${toneClass}`}>
			<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-500">{label}</p>
			<p className="mt-3 text-[clamp(1.7rem,2.4vw,2.35rem)] leading-none font-semibold tracking-tight tabular-nums">
				{value}
			</p>
			<p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
		</div>
	);
}

export default function RemodelyticsPlatform() {
	const [address, setAddress] = useState(INITIAL_ADDRESS);
	const [fetchedContext, setFetchedContext] = useState<RemodelyticsFetchedContext | null>(null);
	const [overrides, setOverrides] = useState<RemodelyticsOverrides>({});
	const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
	const [lookupMessage, setLookupMessage] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const fieldId = useId();
	const inputs = useMemo(
		() => mergeRemodelyticsInputs(INITIAL_INPUTS, fetchedContext, overrides),
		[fetchedContext, overrides]
	);
	const breakdown = useMemo(() => calculateRemodelytics(inputs), [inputs]);

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

	const updateInput = <K extends keyof RemodelyticsInputs>(key: K, value: RemodelyticsInputs[K]) => {
		setOverrides((current) => ({ ...current, [key]: value }));

		if (key === 'projectType' && fetchedContext?.property?.address?.value) {
			void runPropertyLookup(fetchedContext.property.address.value, value as RemodelyticsProjectType);
		}
	};

	const exportPacket = async () => {
		const packet = {
			tool: 'Remodelytics underwriting packet',
			property: {
				address: fetchedContext?.property?.address?.value ?? address,
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
			<AddressLookupPanel
				address={address}
				status={lookupStatus}
				message={lookupMessage}
				context={fetchedContext}
				onAddressChange={setAddress}
				onLookup={() => void runPropertyLookup()}
			/>

			<div className="overflow-hidden rounded-[1.8rem] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(0,11,80,0.76),rgba(2,6,23,0.96)_58%,rgba(29,106,229,0.2))]">
				<div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:px-7">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/80">
							Multi-engine platform
						</p>
						<h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
							Model the remodel like an underwriter, investor, and homeowner at once
						</h2>
						<p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
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
										'rounded-full border px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.22em] transition focus:outline-none focus:ring-2 focus:ring-cyan-400/30',
										inputs.engine === engine
											? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
											: 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
									].join(' ')}
								>
									{ENGINE_LABELS[engine]}
								</button>
							))}
						</div>
					</div>
					<div className="grid content-between gap-4 rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
									Selected project
								</p>
								<p className="mt-2 text-2xl font-semibold text-white">
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

			<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5 rounded-[1.8rem] border border-slate-800/90 bg-slate-950/40 p-5">
				<label className="grid min-w-0 gap-3 rounded-[1.35rem] border border-slate-800/80 bg-slate-950/45 p-4">
					<span className="text-sm font-semibold tracking-wide text-slate-100">Project type</span>
					<select
						value={inputs.projectType}
						onChange={(event) =>
							updateInput('projectType', event.target.value as RemodelyticsProjectType)
						}
						className="min-w-0 rounded-[1rem] border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:text-base"
					>
						{PROJECT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<span className="text-xs leading-5 text-slate-500">Routes the remodel into the best-fit engine.</span>
				</label>
				<label className="grid min-w-0 gap-3 rounded-[1.35rem] border border-slate-800/80 bg-slate-950/45 p-4">
					<span className="text-sm font-semibold tracking-wide text-slate-100">Material tier</span>
					<select
						value={inputs.materialTier}
						onChange={(event) =>
							updateInput('materialTier', event.target.value as RemodelyticsMaterialTier)
						}
						className="min-w-0 rounded-[1rem] border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:text-base"
					>
						{MATERIAL_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<span className="text-xs leading-5 text-slate-500">Applies a proxy finish-grade multiplier.</span>
				</label>
				<label
					htmlFor={`${fieldId}-zip`}
					className="grid min-w-0 gap-3 rounded-[1.35rem] border border-slate-800/80 bg-slate-950/45 p-4"
				>
					<span className="text-sm font-semibold tracking-wide text-slate-100">ZIP code</span>
					<input
						id={`${fieldId}-zip`}
						value={inputs.zipCode}
						onChange={(event) => updateInput('zipCode', event.target.value)}
						className="min-w-0 rounded-[1rem] border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:text-base"
					/>
					<span className="text-xs leading-5 text-slate-500">
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

			<div className="grid gap-4 rounded-[1.8rem] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.11),rgba(2,6,23,0.86))] p-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/80">
							Engine output
						</p>
						<h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
							{ENGINE_LABELS[inputs.engine]} analytics
						</h3>
					</div>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={exportPacket}
							className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
						>
							{copied ? 'Packet copied' : 'Copy underwriting packet'}
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
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
					<div className="rounded-[1.5rem] border border-slate-800/90 bg-slate-950/50 p-5">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Engine confidence map
						</p>
						<div className="mt-5 grid gap-4">
							{(Object.keys(breakdown.engineScores) as RemodelyticsEngine[]).map((engine) => (
								<div key={engine} className="grid gap-2">
									<div className="flex items-center justify-between gap-3">
										<span className="text-sm font-semibold text-slate-200">{ENGINE_LABELS[engine]}</span>
										<span className="font-mono text-xs text-cyan-200">
											{Math.round(breakdown.engineScores[engine])}
										</span>
									</div>
									<div className="h-2 rounded-full bg-white/8">
										<div
											className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400"
											style={{ width: `${Math.min(breakdown.engineScores[engine], 100)}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-[1.5rem] border border-slate-800/90 bg-slate-950/50 p-5">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Safeguards and underwriting flags
						</p>
						<div className="mt-4 grid gap-3">
							<div className="rounded-[1.1rem] border border-slate-800 bg-slate-950/70 p-4">
								<div className="flex items-center justify-between gap-4">
									<p className="text-sm font-semibold text-white"><Acronym term="NKBA" /> budget warning meter</p>
									<span className={`rounded-full border px-3 py-1 text-xs ${getRiskTone(breakdown.overImprovementRisk)}`}>
										{formatNumber(breakdown.nkbaSpendRatio, '%')}
									</span>
								</div>
								<div className="mt-3 h-2 rounded-full bg-white/8">
									<div
										className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400"
										style={{ width: `${Math.min(Math.max(breakdown.nkbaSpendRatio * 4, 8), 100)}%` }}
									/>
								</div>
							</div>
							{breakdown.underwritingWarnings.length ? (
								breakdown.underwritingWarnings.map((warning) => (
									<p
										key={warning}
										className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"
									>
										{warning}
									</p>
								))
							) : (
								<p className="rounded-[1.1rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
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

			<div className="grid gap-5 rounded-[1.8rem] border border-slate-800/90 bg-slate-950/40 p-5">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300/70">
							Underwriting assumptions
						</p>
						<h3 className="mt-2 text-xl font-semibold text-white">As-completed valuation and leverage</h3>
					</div>
					<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-slate-400">
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

			<div className="grid gap-5 rounded-[1.8rem] border border-slate-800/90 bg-slate-950/40 p-5">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-300/70">
							Income and energy assumptions
						</p>
						<h3 className="mt-2 text-xl font-semibold text-white">ADU cash flow and green appraisal inputs</h3>
					</div>
					<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-slate-400">
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
