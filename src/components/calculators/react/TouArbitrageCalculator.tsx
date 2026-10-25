import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runTou, savingsAt, type TouInputs } from '../../../lib/calculators/touArbitrage';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Columns, Meter, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SavePdfButton } from './ui';

interface FormState extends TouInputs {}

const INITIAL: FormState = {
	monthlyKwh: 950,
	evMilesPerDay: 35,
	evMilesPerKwh: 3.1,
	flatRate: 0.185,
	peakRate: 0.34,
	offPeakRate: 0.165,
	superOffPeakRate: 0.085,
	peakShare: 0.32,
	shiftableShare: 0.12,
	evSuperOffPeakShare: 0.9,
	demandCharge: { peakKw: 0, perKw: 0 }
};

const LADDER = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

export default function TouArbitrageCalculator() {
	const persisted = usePersistedInputs<FormState>('tou-ev-arbitrage', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.touArbitrage);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const result = useMemo(() => runTou(form), [form]);

	const verdictCopy =
		result.verdict === 'switch' ? (
			<>
				Switch. Overnight charging and a {Math.round(form.shiftableShare * 100)}% shiftable share cover the
				peak window with room to spare, and the tariff saves {formatCurrency(result.savings)} a year.
			</>
		) : result.verdict === 'conditional' ? (
			<>
				Conditional. The tariff is ahead by {formatCurrency(result.savings)} a year, which is thin enough that a
				change in your evening load — a heat pump, a second car, cooking at six — would erase it.
			</>
		) : (
			<>
				Stay on the flat rate. Your peak-window share is above the ceiling where the tariff stops paying, so the
				overnight discount is subsidising load you cannot move.
			</>
		);

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Time-of-use arbitrage',
			sourcePath: '/calculators/tou-ev-arbitrage/',
			verdict: `Flat ${formatCurrency(result.flatCost)} against time-of-use ${formatCurrency(
				result.touCost
			)}: ${result.verdict}.`,
			sections: [
				{
					heading: 'Tariffs',
					rows: [
						['Flat rate', `$${form.flatRate.toFixed(3)} a kWh`],
						['On-peak', `$${form.peakRate.toFixed(3)} a kWh`],
						['Off-peak', `$${form.offPeakRate.toFixed(3)} a kWh`],
						['Super off-peak', `$${form.superOffPeakRate.toFixed(3)} a kWh`],
						['Demand charge', form.demandCharge.perKw > 0 ? `${formatCurrency(form.demandCharge.perKw)} a kW, ${form.demandCharge.peakKw} kW` : 'none']
					]
				},
				{
					heading: 'Load',
					rows: [
						['Household', `${form.monthlyKwh} kWh a month`],
						['EV', `${form.evMilesPerDay} miles a day at ${form.evMilesPerKwh} mi/kWh`],
						['Peak share today', `${Math.round(form.peakShare * 100)}%`],
						['Shiftable share', `${Math.round(form.shiftableShare * 100)}%`],
						['Break-even peak share', result.breakEvenPeakShare ? `${(result.breakEvenPeakShare * 100).toFixed(1)}%` : 'no ceiling in range']
					]
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_tou_packet', clipboard: copied });
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
				eyebrow="Annual difference"
				figure={formatCurrency(result.savings)}
				caption={result.savings >= 0 ? 'saved by switching to time-of-use' : 'lost by switching to time-of-use'}
				verdict={verdictCopy}
				tone={result.verdict === 'switch' ? 'good' : result.verdict === 'conditional' ? 'warn' : 'bad'}
				stats={[
					{ label: 'Flat tariff', value: formatCurrency(result.flatCost) },
					{ label: 'Time-of-use', value: formatCurrency(result.touCost) },
					{
						label: 'Break-even peak share',
						value: result.breakEvenPeakShare ? `${(result.breakEvenPeakShare * 100).toFixed(1)}%` : '—'
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>Your tariffs</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="tou-flat" label="Flat rate" value={Number((form.flatRate * 100).toFixed(3))} min={0} max={100} step={0.5} suffix="¢ a kWh" onChange={(value) => set('flatRate', value / 100)} hint="From your current bill: supply plus delivery, divided by kWh." />
						<NumberField id="tou-peak" label="On-peak" value={Number((form.peakRate * 100).toFixed(3))} min={0} max={100} step={0.5} suffix="¢ a kWh" onChange={(value) => set('peakRate', value / 100)} />
						<NumberField id="tou-off" label="Off-peak" value={Number((form.offPeakRate * 100).toFixed(3))} min={0} max={100} step={0.5} suffix="¢ a kWh" onChange={(value) => set('offPeakRate', value / 100)} />
						<NumberField id="tou-sop" label="Super off-peak" value={Number((form.superOffPeakRate * 100).toFixed(3))} min={0} max={100} step={0.5} suffix="¢ a kWh" onChange={(value) => set('superOffPeakRate', value / 100)} />
					</div>
				</div>

				<div>
					<SectionRule>Your load</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="tou-kwh" label="Household electricity" value={form.monthlyKwh} min={100} max={5000} step={50} suffix="kWh a month" onChange={(value) => set('monthlyKwh', value)} hint="Excluding the car." />
						<NumberField id="tou-miles" label="EV miles a day" value={form.evMilesPerDay} min={0} max={200} suffix="miles" onChange={(value) => set('evMilesPerDay', value)} />
						<NumberField id="tou-eff" label="EV efficiency" value={form.evMilesPerKwh} min={1.5} max={5} step={0.1} suffix="mi/kWh" onChange={(value) => set('evMilesPerKwh', value)} hint="Includes wall-connector losses." />
						<RateField id="tou-peakshare" label="Load in the peak window" value={form.peakShare} onChange={(value) => set('peakShare', Math.min(1, value))} step={1} max={100} hint="Share of your household electricity used between four and nine in the evening." />
						<RateField id="tou-shift" label="Share you can move" value={form.shiftableShare} onChange={(value) => set('shiftableShare', Math.min(1, value))} step={1} max={100} hint="Laundry, dishwasher, pre-cooling. Not the oven at dinner." />
						<RateField id="tou-evsop" label="Charging in super off-peak" value={form.evSuperOffPeakShare} onChange={(value) => set('evSuperOffPeakShare', Math.min(1, value))} step={5} max={100} />
						<MoneyField id="tou-demandpk" label="Peak demand" value={form.demandCharge.peakKw} step={1} onChange={(value) => set('demandCharge', { ...form.demandCharge, peakKw: value })} hint="Set to zero if the tariff has no demand component." />
						<MoneyField id="tou-demandrate" label="Demand charge" value={form.demandCharge.perKw} step={1} onChange={(value) => set('demandCharge', { ...form.demandCharge, perKw: value })} />
					</div>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Where the kilowatt-hours land</p>
					<div className="mt-4">
						<Meter
							segments={[
								{ label: 'Peak, four to nine', value: result.shares.peak, tone: 'ink' },
								{ label: 'Off-peak', value: result.shares.offPeak, tone: 'mid' },
								{ label: 'Super off-peak', value: result.shares.superOffPeak, tone: 'pale' }
							]}
						/>
					</div>
					<p className="mt-3 text-[0.75rem] leading-snug text-ink-2/85">
						The three shares always sum to one: moving load out of the peak window cannot create energy, and
						an engine that lets it do so will understate the saving.
					</p>
				</div>

				<Rows
					title="The year, both ways"
					rows={[
						{ label: 'Household energy', value: `${Math.round(result.homeKwh).toLocaleString('en-US')} kWh` },
						{ label: 'EV energy', value: `${Math.round(result.evKwh).toLocaleString('en-US')} kWh` },
						{ label: 'Flat tariff', value: formatCurrency(result.flatCost) },
						{ label: 'Time-of-use, including demand', value: formatCurrency(result.touCost) },
						{ label: 'Difference', value: formatCurrency(result.savings), emphasis: true }
					]}
				/>
			</div>

			<div className="border-t border-ink/15 p-6 sm:p-8">
				<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Saving at each peak share</p>
				<div className="mt-4">
					<Columns
						columns={['Peak share', 'Annual difference', 'Verdict']}
						rows={LADDER.map((share) => {
							const saving = savingsAt(form, share);
							return [
								`${Math.round(share * 100)}%${Math.abs(share - form.peakShare) < 0.001 ? ' ← you' : ''}`,
								formatCurrency(saving),
								saving > 0 ? 'ahead' : 'behind'
							];
						})}
						caption="A ladder rather than a single number: the answer depends on how much of your evening load is immovable, and only you know that."
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					Rates are yours to enter: there is no national tariff table that stays true, and a default that ages
					silently is worse than a blank field.
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the comparison'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} />
			</div>
		</div>
	);
}
