import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { ROOF_LIVES } from '../../../lib/calculators/data/components';
import { runInsuranceGap, type InsuranceGapInputs } from '../../../lib/calculators/insuranceGap';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, MoneyField, Note, NumberField, Rows, SectionRule, SelectField, SavePdfButton } from './ui';

const INITIAL: InsuranceGapInputs = {
	coverageA: 500000,
	flatDeductible: 2500,
	perilDeductibles: { wind: 0.02, hail: 0.02, namedStorm: 0.05, hurricane: 0.05 },
	roofMaterial: 'asphalt-3tab',
	roofAge: 15,
	roofReplacementCost: 22000,
	settlement: 'acv',
	claimOpen: true,
	monthsSinceClaim: 3
};

const pct = (value: number) => `${(value * 100).toFixed(value * 100 < 1 ? 2 : 1)}%`;

export default function InsuranceGapCalculator() {
	const persisted = usePersistedInputs<InsuranceGapInputs>('insurance-coverage-gap', INITIAL, {
		allowedKeys: ['coverageA', 'flatDeductible', 'perilDeductibles', 'roofMaterial', 'roofAge', 'roofReplacementCost', 'settlement', 'claimOpen', 'monthsSinceClaim'],
		version: 1
	});
	const inputs = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.coverageGap);

	const result = useMemo(() => runInsuranceGap(inputs), [inputs]);

	const set = <K extends keyof InsuranceGapInputs>(key: K, value: InsuranceGapInputs[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const setPeril = (key: keyof InsuranceGapInputs['perilDeductibles'], value: number) => {
		persisted.setValue((prev) => ({ ...prev, perilDeductibles: { ...prev.perilDeductibles, [key]: value } }));
		onInputChange(`perilDeductibles.${key}`);
	};

	const verdictCopy =
		result.verdict === 'gap-dominated'
			? `The depreciation gap is the larger number. On a total loss the carrier withholds ${formatCurrency(
					result.depreciation.withheld
				)} of a ${formatCurrency(inputs.roofReplacementCost)} roof, and the second check is the only way back.`
			: `Percentage deductibles put ${formatCurrency(result.maxPeril.dollars)} on the table before the carrier pays anything. That cash has to exist on the morning of the storm.`;

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Insurance coverage gap',
			sourcePath: '/calculators/insurance-coverage-gap/',
			verdict: `${formatCurrency(result.liquidExposure)} of cash needed on the worst day, with ${formatCurrency(
				result.maxPeril.dollars
			)} of it in the largest percentage deductible.`,
			sections: [
				{
					heading: 'Policy',
					rows: [
						['Coverage A', formatCurrency(inputs.coverageA)],
						['Flat deductible', formatCurrency(inputs.flatDeductible)],
						['Settlement basis', inputs.settlement === 'acv' ? 'actual cash value' : 'replacement cost'],
						['Roof', `${inputs.roofMaterial} at ${Math.round(inputs.roofAge)} years, life ${result.depreciation.life}`]
					]
				},
				{
					heading: 'Peril deductibles',
					rows: result.perils.map((peril) => [peril.label, `${pct(peril.share)} — ${formatCurrency(peril.dollars)}`])
				},
				{
					heading: 'The gap',
					rows: [
						['Depreciation withheld', formatCurrency(result.depreciation.withheld)],
						['Carrier pays on the roof', formatCurrency(result.depreciation.paysOut)],
						['Total liquid exposure', formatCurrency(result.liquidExposure)]
					]
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_coverage_gap_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	const savePdf = () => {
		const opened = saveScenarioPacketAsPdf(buildPacket());
		setPdfState(opened ? 'opened' : 'blocked');
		// The strongest export signal on the page: `printed` records that the dialog
		// opened, never that a file was written — the visitor finishes in the dialog.
		onComplete({ action: 'save_pdf', printed: opened });
		window.setTimeout(() => setPdfState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Cash needed on the worst day"
				figure={formatCurrency(result.liquidExposure)}
				caption="before the carrier pays anything"
				verdict={verdictCopy}
				tone={result.verdict === 'gap-dominated' ? 'bad' : 'warn'}
				stats={[
					{ label: 'Largest peril deductible', value: formatCurrency(result.maxPeril.dollars) },
					{ label: 'Depreciation withheld', value: formatCurrency(result.depreciation.withheld) },
					{
						label: 'Recovery window',
						value: result.recoveryMonthsLeft !== null ? `${result.recoveryMonthsLeft} months left` : 'no open claim'
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The policy</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField
							id="ig-coverage"
							label="Coverage A, dwelling"
							value={inputs.coverageA}
							step={10000}
							onChange={(value) => set('coverageA', value)}
							hint="Percentage deductibles are charged against this limit, not against the damage."
						/>
						<MoneyField
							id="ig-flat"
							label="Flat deductible"
							value={inputs.flatDeductible}
							step={250}
							onChange={(value) => set('flatDeductible', value)}
						/>
						<SelectField
							id="ig-settlement"
							label="Roof settlement"
							value={inputs.settlement}
							options={[
								{ value: 'acv' as const, label: 'Actual cash value' },
								{ value: 'rcv' as const, label: 'Replacement cost' }
							]}
							onChange={(value) => set('settlement', value)}
							hint="Schedules that settle at actual cash value deduct depreciation from the payout."
						/>
						<Choice
							label="Open claim"
							value={inputs.claimOpen ? 'yes' : 'no'}
							options={[
								{ value: 'no', label: 'No claim open' },
								{ value: 'yes', label: 'Claim open' }
							]}
							onChange={(value) => {
								set('claimOpen', value === 'yes');
								onInputChange('claimOpen');
							}}
						/>
						{inputs.claimOpen ? (
							<NumberField
								id="ig-months"
								label="Months since filing"
								value={inputs.monthsSinceClaim}
								min={0}
								max={36}
								suffix="months"
								onChange={(value) => set('monthsSinceClaim', value)}
								hint="The withheld depreciation is typically recoverable for twelve months from the filing."
							/>
						) : null}
					</div>
				</div>

				<div>
					<SectionRule>Percentage deductibles</SectionRule>
					<div className="divide-y divide-ink/10">
						{(['wind', 'hail', 'namedStorm', 'hurricane'] as const).map((peril) => (
							<NumberField
								key={peril}
								id={`ig-${peril}`}
								label={peril === 'namedStorm' ? 'Named storm' : peril.charAt(0).toUpperCase() + peril.slice(1)}
								value={Number((inputs.perilDeductibles[peril] * 100).toFixed(2))}
								min={0}
								max={10}
								step={0.5}
								suffix="% of Coverage A"
								onChange={(value) => setPeril(peril, value / 100)}
							/>
						))}
					</div>
					<SectionRule>The roof</SectionRule>
					<div className="divide-y divide-ink/10">
						<SelectField
							id="ig-material"
							label="Material"
							value={inputs.roofMaterial}
							options={ROOF_LIVES.map((item) => ({ value: item.id, label: `${item.label} (${item.life} yr)` }))}
							onChange={(value) => set('roofMaterial', value)}
						/>
						<NumberField
							id="ig-age"
							label="Roof age"
							value={inputs.roofAge}
							min={0}
							max={60}
							suffix="years"
							onChange={(value) => set('roofAge', value)}
						/>
						<MoneyField
							id="ig-roofcost"
							label="Replacement cost"
							value={inputs.roofReplacementCost}
							step={1000}
							onChange={(value) => set('roofReplacementCost', value)}
							hint="What a contractor would charge today, not what the roof cost when it went on."
						/>
					</div>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="Peril by peril"
					rows={[
						...result.perils.map((peril) => ({
							label: `${peril.label} — ${pct(peril.share)}`,
							value: formatCurrency(peril.dollars),
							emphasis: peril.dollars === result.maxPeril.dollars
						}))
					]}
					foot="The largest of these is not additive with the others: a hurricane is not also a hail event. It is additive with the depreciation gap, because the same storm takes the roof."
				/>

				<Rows
					title="The roof, at settlement"
					rows={[
						{ label: `Expected life (${inputs.roofMaterial})`, value: `${result.depreciation.life} years` },
						{ label: 'Age as a share of life', value: pct(result.depreciation.ratio) },
						{ label: 'Replacement cost', value: formatCurrency(inputs.roofReplacementCost) },
						{ label: 'Withheld as depreciation', value: formatCurrency(result.depreciation.withheld) },
						{ label: 'Carrier pays', value: formatCurrency(result.depreciation.paysOut), emphasis: true }
					]}
					foot={
						inputs.settlement === 'rcv'
							? 'On a replacement-cost policy nothing is withheld up front. The recovery window still matters: the second check only arrives after the work is invoiced.'
							: 'The straight-line figure is an estimate. The exact schedule lives in the policy endorsement, and the adjuster applies it — ask for it in writing before you agree to a scope.'
					}
				/>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					This is a policy reading, not an underwriting opinion. Coverage terms, endorsements and
					exclusions decide the claim.
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied'
						? 'Copied'
						: copyState === 'blocked'
							? 'Copy blocked — select the text'
							: 'Copy the exposure'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} />
			</div>
		</div>
	);
}
