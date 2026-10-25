import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { HOUSEHOLD_COMPONENTS, midpointCost } from '../../../lib/calculators/data/components';
import { JURISDICTIONS, DEFAULT_JURISDICTION, defaultEffectiveRate, jurisdictionById } from '../../../lib/calculators/data/jurisdictions';
import { runOwnershipCost, type OwnershipCostInputs } from '../../../lib/calculators/ownershipCost';
import { MACRO_2026 } from '../../../lib/calculators/data/macro2026';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, Columns, Meter, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SelectField, SavePdfButton } from './ui';

interface FormState {
	price: number;
	downPaymentShare: number;
	rate: number;
	termMonths: number;
	jurisdictionId: string;
	effectiveTaxRate: number;
	insuranceAnnual: number;
	floodAnnual: number;
	hoaMonthly: number;
	hoaReserveFunding: number;
	homeAge: number;
}

const INITIAL: FormState = {
	price: MACRO_2026.medianExistingPrice,
	downPaymentShare: 0.1,
	rate: MACRO_2026.mortgageRate,
	termMonths: 360,
	jurisdictionId: DEFAULT_JURISDICTION,
	effectiveTaxRate: defaultEffectiveRate(jurisdictionById(DEFAULT_JURISDICTION)!),
	insuranceAnnual: 3057,
	floodAnnual: 0,
	hoaMonthly: 0,
	hoaReserveFunding: 0.8,
	homeAge: 18
};

export default function OwnershipCostCalculator() {
	const persisted = usePersistedInputs<FormState>('true-cost-of-ownership', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.escrowTrueCost);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const chooseJurisdiction = (id: string) => {
		const jurisdiction = jurisdictionById(id);
		persisted.setValue((prev) => ({
			...prev,
			jurisdictionId: id,
			effectiveTaxRate: jurisdiction ? defaultEffectiveRate(jurisdiction) : prev.effectiveTaxRate
		}));
		onInputChange('jurisdictionId');
	};

	const inputs: OwnershipCostInputs = useMemo(
		() => ({
			price: form.price,
			downPaymentShare: form.downPaymentShare,
			rate: form.rate,
			termMonths: form.termMonths,
			jurisdictionId: form.jurisdictionId,
			effectiveTaxRate: form.effectiveTaxRate,
			insuranceAnnual: form.insuranceAnnual,
			floodAnnual: form.floodAnnual,
			hoaMonthly: form.hoaMonthly,
			hoaReserveFunding: form.hoaReserveFunding,
			components: HOUSEHOLD_COMPONENTS.map((component) => ({
				id: component.id,
				age: Math.min(form.homeAge, (component.life[0] + component.life[1]) / 2),
				replacementCost: midpointCost(component)
			}))
		}),
		[form]
	);

	const result = useMemo(() => runOwnershipCost(inputs), [inputs]);
	const jurisdiction = result.jurisdiction;

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'True cost of ownership',
			sourcePath: '/calculators/true-cost-of-ownership/',
			verdict: `${formatCurrency(result.monthly)} a month, of which ${formatCurrency(result.monthly - result.principalInterest)} is not debt service.`,
			sections: [
				{
					heading: 'The house',
					rows: [
						['Price', formatCurrency(form.price)],
						['Down payment', `${(form.downPaymentShare * 100).toFixed(0)}%`],
						['Rate', `${(form.rate * 100).toFixed(2)}%`],
						['Term', `${form.termMonths} months`],
						['Jurisdiction', jurisdiction?.label ?? form.jurisdictionId]
					]
				},
				{
					heading: 'Monthly outflow',
					rows: result.rows.map((row) => [row.label, formatCurrency(row.monthly)])
				},
				{
					heading: 'Projection',
					rows: result.projection.map((year) => [`Year ${year.year}`, `${formatCurrency(year.monthly)} a month`])
				}
			]
		};
		return packet;
	};

	/**
	 * The copy action. The guard stays in the handler, not in buildPacket: an unmodelable
	 * jurisdiction has no packet to build, and both exports must refuse rather than print a total
	 * the engine says it cannot model.
	 */
	const copyPacket = async () => {
		if (!result.modelable) return;
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_ownership_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	const savePdf = () => {
		if (!result.modelable) return;
		const opened = saveScenarioPacketAsPdf(buildPacket());
		setPdfState(opened ? 'opened' : 'blocked');
		// The strongest export signal on the page. `printed` records that the dialog opened,
		// never that a file was written — the visitor finishes in the dialog.
		onComplete({ action: 'save_pdf', printed: opened });
		window.setTimeout(() => setPdfState('idle'), 2400);
	};

	const meterSegments = result.rows.map((row, index) => ({
		label: row.label,
		value: row.monthly,
		tone: (['pine', 'ink', 'mid', 'soft', 'pale', 'pale'] as const)[Math.min(index, 5)]
	}));

	return (
		<div>
			<Band
				eyebrow="Monthly outflow, year one"
				figure={result.modelable ? formatCurrency(result.monthly) : '—'}
				caption={result.modelable ? 'all five rows, not PITI' : 'jurisdiction not modelled'}
				verdict={
					result.modelable ? (
						<>
							{formatCurrency(result.monthly - result.principalInterest)} of that is not debt service, and{' '}
							{formatCurrency(result.taxYear1 - result.sellerTaxAnnual)} of the tax line is a step-up the
							seller never paid.
						</>
					) : (
						<>
							This jurisdiction is not in the table, so the engine will not invent a rate for it. The
							states and counties it carries are listed below.
						</>
					)
				}
				tone={result.modelable ? 'neutral' : 'warn'}
				stats={
					result.modelable
						? [
								{ label: 'Tax, first year', value: formatCurrency(result.taxYear1) },
								{ label: 'Step-up on sale', value: formatCurrency(result.taxStepUp) },
								{ label: 'Non-debt share', value: `${Math.round(result.nonDebtShare * 100)}%` }
							]
						: undefined
				}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The purchase</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="oc-price" label="Purchase price" value={form.price} step={5000} onChange={(value) => set('price', value)} />
						<RateField
							id="oc-down"
							label="Down payment"
							value={form.downPaymentShare}
							onChange={(value) => set('downPaymentShare', Math.min(1, value))}
							step={0.5}
							max={100}
							hint="A share of price, so 10 means ten percent."
						/>
						<RateField id="oc-rate" label="Mortgage rate" value={form.rate} onChange={(value) => set('rate', value)} hint={`Default is the 30-year average for the week of ${MACRO_2026.asOf}.`} />
						<NumberField
							id="oc-term"
							label="Term"
							value={form.termMonths}
							min={60}
							max={480}
							step={12}
							suffix="months"
							onChange={(value) => set('termMonths', value)}
						/>
					</div>
				</div>

				<div>
					<SectionRule>The carrying cost</SectionRule>
					<div className="divide-y divide-ink/10">
						<SelectField
							id="oc-jurisdiction"
							label="Jurisdiction"
							value={form.jurisdictionId}
							options={JURISDICTIONS.map((item) => ({ value: item.id, label: item.label }))}
							onChange={chooseJurisdiction}
							badge="coverage"
						/>
						<RateField
							id="oc-taxrate"
							label="Effective tax rate"
							value={form.effectiveTaxRate}
							onChange={(value) => set('effectiveTaxRate', value)}
							step={0.01}
							hint="Against market value. Your tax bill wins over the seeded range."
						/>
						<MoneyField id="oc-insurance" label="Insurance, a year" value={form.insuranceAnnual} step={100} onChange={(value) => set('insuranceAnnual', value)} hint="Your quote. The national average is a placeholder, not a forecast." />
						<MoneyField id="oc-flood" label="Flood rider, a year" value={form.floodAnnual} step={100} onChange={(value) => set('floodAnnual', value)} />
						<MoneyField id="oc-hoa" label="HOA dues, a month" value={form.hoaMonthly} step={25} onChange={(value) => set('hoaMonthly', value)} />
						<RateField
							id="oc-reserve"
							label="HOA reserve funding"
							value={form.hoaReserveFunding}
							onChange={(value) => set('hoaReserveFunding', Math.min(1, value))}
							step={5}
							max={100}
							hint="From the reserve study. Below 70%, the engine spreads a modelled assessment over three years."
						/>
						<NumberField
							id="oc-age"
							label="House age"
							value={form.homeAge}
							min={0}
							max={120}
							suffix="years"
							onChange={(value) => set('homeAge', value)}
							hint="Sets the reserve row. The sinking-fund engine lets you age each system separately."
						/>
					</div>
				</div>
			</div>

			{result.modelable ? (
				<>
					<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
						<Rows
							title="Year one, line by line"
							rows={result.rows.map((row) => ({ label: row.label, value: formatCurrency(row.monthly), hint: row.note }))}
							foot={`The tax row is charged on the purchase price, which is what the county will assess. The seller's bill was ${formatCurrency(
								result.sellerTaxAnnual
							)} a year.`}
						/>
						<div className="grid content-start gap-5">
							<div>
								<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Where the payment goes</p>
								<div className="mt-4">
									<Meter segments={meterSegments} />
								</div>
							</div>
							<Columns
								columns={['Year', 'Monthly', 'Tax', 'Insurance']}
								rows={result.projection.map((year) => [
									`Year ${year.year}`,
									formatCurrency(year.monthly),
									formatCurrency(year.tax),
									formatCurrency(year.insurance)
								])}
								caption="Escrow inflates faster than the mortgage: 4% on tax, 8% on insurance, 5% on the reserve."
							/>
						</div>
					</div>

					<div className="border-t border-ink/15 bg-paper-2/60 px-6 py-5 sm:px-8">
						<p className="text-[0.8125rem] leading-relaxed text-ink-2">
							{jurisdiction?.note}
						</p>
						<p className="mt-1.5 text-[0.75rem] text-ink-2/80">{jurisdiction?.source}</p>
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
					The reserve row is a hazard model, not a rule of thumb: a 1998 house with original systems carries
					a different monthly cost than a 2019 house with none.
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					disabled={!result.modelable}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink disabled:opacity-40"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the outflow'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} disabled={!result.modelable} />
			</div>
		</div>
	);
}
