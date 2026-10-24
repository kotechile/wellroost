import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { JURISDICTIONS, defaultEffectiveRate, jurisdictionById } from '../../../lib/calculators/data/jurisdictions';
import { currentTax, runTaxAppeal, type Comp, type TaxAppealInputs } from '../../../lib/calculators/taxAppeal';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Columns, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SelectField } from './ui';

interface FormState {
	jurisdictionId: string;
	assessedValue: number;
	effectiveRate: number;
	subjectSqft: number;
	subjectBeds: number;
	subjectBaths: number;
	subjectGarage: number;
	comps: Comp[];
	filingFee: number;
	contingencyShare: number;
	discountRate: number;
	years: number;
}

const INITIAL: FormState = {
	jurisdictionId: 'ga',
	assessedValue: 100000,
	effectiveRate: 0.0098,
	subjectSqft: 2200,
	subjectBeds: 4,
	subjectBaths: 3,
	subjectGarage: 2,
	comps: [
		{ price: 215000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 3 },
		{ price: 225000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 5 },
		{ price: 220000, sqft: 2200, beds: 4, baths: 3, garage: 2, monthsAgo: 4 }
	],
	filingFee: 0,
	contingencyShare: 0,
	discountRate: 0.04,
	years: 5
};

const VERDICT_COPY = {
	file: 'The implied value runs well above your evidence. File, and attach this grid.',
	marginal: 'Close enough to argue and not close enough to promise. File if the deadline is free and the board meets soon.',
	below: 'The assessment is defensible against this evidence. Filing is unlikely to move it.',
	insufficient: 'Three comparable sales are the minimum. Below that the engine will not state a verdict.'
} as const;

export default function TaxAppealCalculator() {
	const persisted = usePersistedInputs<FormState>('property-tax-appeal', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.taxAppeal);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const chooseJurisdiction = (id: string) => {
		const jurisdiction = jurisdictionById(id);
		persisted.setValue((prev) => ({
			...prev,
			jurisdictionId: id,
			effectiveRate: jurisdiction ? defaultEffectiveRate(jurisdiction) : prev.effectiveRate
		}));
		onInputChange('jurisdictionId');
	};

	const updateComp = (index: number, patch: Partial<Comp>) => {
		persisted.setValue((prev) => ({
			...prev,
			comps: prev.comps.map((comp, position) => (position === index ? { ...comp, ...patch } : comp))
		}));
		onInputChange('comps');
	};

	const addComp = () => {
		persisted.setValue((prev) => ({
			...prev,
			comps: [...prev.comps, { ...prev.comps[0], price: prev.comps[0]?.price ?? 200000, monthsAgo: 6 }]
		}));
		onInputChange('comps');
	};

	const removeComp = (index: number) => {
		persisted.setValue((prev) => ({ ...prev, comps: prev.comps.filter((_, position) => position !== index) }));
		onInputChange('comps');
	};

	const inputs: TaxAppealInputs = useMemo(
		() => ({
			jurisdictionId: form.jurisdictionId,
			assessedValue: form.assessedValue,
			effectiveRate: form.effectiveRate,
			subject: { sqft: form.subjectSqft, beds: form.subjectBeds, baths: form.subjectBaths, garage: form.subjectGarage },
			comps: form.comps,
			filingFee: form.filingFee,
			contingencyShare: form.contingencyShare,
			discountRate: form.discountRate,
			years: form.years
		}),
		[form]
	);

	const result = useMemo(() => runTaxAppeal(inputs), [inputs]);
	const rollTax = useMemo(() => currentTax(inputs, result), [inputs, result]);
	const jurisdiction = result.jurisdiction;

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Property tax appeal',
			sourcePath: '/calculators/property-tax-appeal/',
			verdict: result.modelable
				? `The roll implies ${formatCurrency(result.impliedValue)}; your evidence supports ${formatCurrency(
						result.medianAdjusted
					)}. Verdict: ${result.verdict}.`
				: 'Jurisdiction not modelled.',
			sections: [
				{
					heading: 'Jurisdiction',
					rows: [
						['County or state', jurisdiction?.label ?? form.jurisdictionId],
						['Assessment ratio', `${(jurisdiction?.assessmentRatio ?? 0) * 100}%`],
						['Effective rate used', `${(form.effectiveRate * 100).toFixed(2)}%`],
						['Board', jurisdiction?.appeal.board ?? '—'],
						['Deadline', jurisdiction?.appeal.deadline ?? '—']
					]
				},
				{
					heading: 'The comparison',
					rows: [
						['Assessed value', formatCurrency(form.assessedValue)],
						['Implied market value', formatCurrency(result.impliedValue)],
						['Median adjusted comp', formatCurrency(result.medianAdjusted)],
						['Excess', formatCurrency(result.excess)],
						['Variance', `${(result.varianceShare * 100).toFixed(1)}%`]
					]
				},
				{
					heading: 'Evidence grid',
					rows: result.adjustments.map((row) => [
						`Comp ${row.index}`,
						`${formatCurrency(row.price)} + ${formatCurrency(row.sqftAdjustment)} + ${formatCurrency(
							row.featureAdjustment
						)} = ${formatCurrency(row.adjusted)}`
					])
				},
				{
					heading: 'The filing',
					rows: [
						['Annual tax reduction', formatCurrency(result.firstYearSavings)],
						['Present value', formatCurrency(result.npv)],
						['Cost to file', formatCurrency(result.costToFile)],
						['Adjustment rate', `${formatCurrency(result.compPricePerSqft)} a square foot`]
					]
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_appeal_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Market value the roll implies"
				figure={result.modelable ? formatCurrency(result.impliedValue) : '—'}
				caption={
					result.modelable
						? `against ${formatCurrency(result.medianAdjusted)} of adjusted comps`
						: 'jurisdiction not modelled'
				}
				verdict={VERDICT_COPY[result.verdict]}
				tone={result.verdict === 'file' ? 'good' : result.verdict === 'marginal' ? 'warn' : 'bad'}
				stats={
					result.modelable
						? [
								{ label: 'Excess value', value: formatCurrency(result.excess) },
								{ label: 'Annual tax at stake', value: formatCurrency(result.firstYearSavings) },
								{
									label: 'Present value',
									value: formatCurrency(result.npv)
								}
							]
						: undefined
				}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The roll</SectionRule>
					<div className="divide-y divide-ink/10">
						<SelectField
							id="ta-jurisdiction"
							label="Jurisdiction"
							value={form.jurisdictionId}
							options={JURISDICTIONS.map((item) => ({ value: item.id, label: item.label }))}
							onChange={chooseJurisdiction}
							badge="coverage"
						/>
						<MoneyField
							id="ta-assessed"
							label="Assessed value on the roll"
							value={form.assessedValue}
							step={1000}
							onChange={(value) => set('assessedValue', value)}
							hint="From the notice, not the market estimate the county's website shows."
						/>
						<RateField
							id="ta-rate"
							label="Effective tax rate"
							value={form.effectiveRate}
							onChange={(value) => set('effectiveRate', value)}
							step={0.01}
							hint="Tax paid divided by market value. Your bill is the authority."
						/>
						<MoneyField id="ta-fee" label="Filing fee" value={form.filingFee} step={25} onChange={(value) => set('filingFee', value)} hint="Most boards charge nothing for a residential petition." />
						<RateField
							id="ta-contingency"
							label="Contingency"
							value={form.contingencyShare}
							onChange={(value) => set('contingencyShare', value)}
							step={5}
							max={100}
							hint="Zero if you file yourself. Representatives charge a share of the first year."
						/>
					</div>
				</div>

				<div>
					<SectionRule>Your property</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="ta-sqft" label="Square feet" value={form.subjectSqft} min={200} max={12000} step={50} onChange={(value) => set('subjectSqft', value)} />
						<NumberField id="ta-beds" label="Bedrooms" value={form.subjectBeds} min={0} max={12} onChange={(value) => set('subjectBeds', value)} />
						<NumberField id="ta-baths" label="Bathrooms" value={form.subjectBaths} min={0} max={12} step={0.5} onChange={(value) => set('subjectBaths', value)} />
						<NumberField id="ta-garage" label="Garage stalls" value={form.subjectGarage} min={0} max={6} onChange={(value) => set('subjectGarage', value)} />
						<NumberField
							id="ta-years"
							label="Years of savings to value"
							value={form.years}
							min={1}
							max={15}
							suffix="years"
							onChange={(value) => set('years', value)}
						/>
					</div>
				</div>
			</div>

			{result.modelable ? (
				<>
					<div className="border-t border-ink/15 p-6 sm:p-8">
						<div className="flex flex-wrap items-baseline justify-between gap-3">
							<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">
								Your comps, adjusted to your house
							</p>
							<button
								type="button"
								onClick={addComp}
								className="text-[0.78rem] text-pine underline decoration-pine/40 underline-offset-4 hover:decoration-pine"
							>
								Add a comp
							</button>
						</div>

						<div className="mt-4 grid gap-4">
							{form.comps.map((comp, index) => (
								<div key={index} className="grid gap-3 border-b border-ink/10 pb-4 sm:grid-cols-[auto_repeat(5,minmax(0,1fr))_auto] sm:items-end">
									<span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-2 sm:pb-1.5">
										{String(index + 1).padStart(2, '0')}
									</span>
									<label className="grid gap-1">
										<span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-2">Sale price</span>
										<input
											type="number"
											value={comp.price}
											step={1000}
											onChange={(event) => updateComp(index, { price: Number(event.target.value) })}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-2">Sq ft</span>
										<input
											type="number"
											value={comp.sqft}
											step={50}
											onChange={(event) => updateComp(index, { sqft: Number(event.target.value) })}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-2">Beds</span>
										<input
											type="number"
											value={comp.beds}
											onChange={(event) => updateComp(index, { beds: Number(event.target.value) })}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-2">Baths</span>
										<input
											type="number"
											value={comp.baths}
											step={0.5}
											onChange={(event) => updateComp(index, { baths: Number(event.target.value) })}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-2">Months ago</span>
										<input
											type="number"
											value={comp.monthsAgo}
											onChange={(event) => updateComp(index, { monthsAgo: Number(event.target.value) })}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<button
										type="button"
										onClick={() => removeComp(index)}
										disabled={form.comps.length <= 1}
										className="text-[0.72rem] text-ink-2 underline underline-offset-4 disabled:opacity-30 sm:pb-1.5"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					</div>

					<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
						<Columns
							columns={['Comp', 'Sale', 'Δ size', 'Δ features', 'Adjusted']}
							rows={result.adjustments.map((row) => [
								`#${row.index}${row.stale ? ' · stale' : ''}`,
								formatCurrency(row.price),
								formatCurrency(row.sqftAdjustment),
								formatCurrency(row.featureAdjustment),
								formatCurrency(row.adjusted)
							])}
							caption={`Adjustment rate: ${formatCurrency(result.compPricePerSqft)} a square foot, taken from your own sales. A comp older than twelve months is flagged, not excluded.`}
						/>
						<Rows
							title="The filing, priced"
							rows={[
								{ label: 'Implied market value', value: formatCurrency(result.impliedValue) },
								{ label: 'Median adjusted comp', value: formatCurrency(result.medianAdjusted) },
								{ label: 'Excess market value', value: formatCurrency(result.excess), emphasis: true },
								{ label: 'Variance', value: `${(result.varianceShare * 100).toFixed(1)}%` },
								{ label: 'Tax on the roll today', value: formatCurrency(rollTax) },
								{ label: 'Annual reduction', value: formatCurrency(result.firstYearSavings) },
								{ label: `Present value, ${form.years} years`, value: formatCurrency(result.npv) }
							]}
							foot={
								jurisdiction
									? `${jurisdiction.appeal.board}. Deadline: ${jurisdiction.appeal.deadline.toLowerCase()}. ${jurisdiction.note}`
									: undefined
							}
						/>
					</div>
				</>
			) : (
				<div className="border-t border-ink/15 bg-paper-2/60 px-6 py-5 sm:px-8">
					<p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ink-2">Modelled jurisdictions</p>
					<ul className="mt-2 grid gap-1 text-[0.8125rem] text-ink-2 sm:grid-cols-2">
						{result.coverage.map((label) => (
							<li key={label}>{label}</li>
						))}
					</ul>
				</div>
			)}

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					The engine does not source comparables and will not invent them. The strength of the petition is
					the strength of the sales you type in.
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					disabled={!result.modelable}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink disabled:opacity-40"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the evidence packet'}
				</button>
			</div>
		</div>
	);
}
