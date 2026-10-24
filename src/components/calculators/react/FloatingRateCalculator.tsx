import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runFloatingRate, type FloatingProduct, type FloatingRateInputs } from '../../../lib/calculators/floatingRate';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, Columns, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SelectField } from './ui';

const INITIAL: FloatingRateInputs = {
	product: 'heloc-draw',
	balance: 44000,
	currentRate: 0.074,
	lifetimeCapRate: 0.18,
	periodicCap: 0.02,
	monthsToReset: 6,
	amortizeMonths: 240,
	monthlyCushion: 75
};

const PRODUCTS: Array<{ value: FloatingProduct; label: string }> = [
	{ value: 'heloc-draw', label: 'HELOC, draw period' },
	{ value: 'heloc-repay', label: 'HELOC, repayment' },
	{ value: 'arm', label: 'Adjustable-rate mortgage' }
];

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

export default function FloatingRateCalculator() {
	const persisted = usePersistedInputs<FloatingRateInputs>('heloc-arm-stress', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const inputs = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.floatingRate);

	const result = useMemo(() => runFloatingRate(inputs), [inputs]);

	const set = <K extends keyof FloatingRateInputs>(key: K, value: FloatingRateInputs[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const verdictCopy =
		result.verdict === 'exposed'
			? `One scheduled adjustment eats the whole cushion. At the ${pct(inputs.periodicCap)} cap, the payment arrives before the budget does.`
			: result.verdict === 'watch'
				? `The cushion survives one adjustment and not two. That buys time; it does not buy a plan.`
				: `The cushion covers more than two adjustments, or the balance stops repricing before it gets there.`;

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Floating-rate stress test',
			sourcePath: '/calculators/heloc-arm-stress/',
			verdict:
				result.cushionBps !== null
					? `${result.cushionBps} basis points of movement exhausts a ${formatCurrency(inputs.monthlyCushion)} cushion.`
					: 'The cushion survives to the lifetime ceiling.',
			sections: [
				{
					heading: 'The balance',
					rows: [
						['Product', PRODUCTS.find((item) => item.value === inputs.product)?.label ?? inputs.product],
						['Balance', formatCurrency(inputs.balance)],
						['Rate today', pct(inputs.currentRate)],
						['Payment today', formatCurrency(result.currentPayment)],
						['Next reset', `${inputs.monthsToReset} months`],
						['Lifetime ceiling', pct(inputs.lifetimeCapRate)]
					]
				},
				{
					heading: 'Steps',
					rows: result.steps.map((step) => [
						`+${step.bps} bps (${pct(step.rate)})`,
						step.blocked ? 'beyond the ceiling' : `${formatCurrency(step.payment)} a month, +${formatCurrency(step.deltaPayment)}`
					])
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_floating_rate_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Payment after the next reset"
				figure={formatCurrency(result.nextAdjustment.payment)}
				caption={`${result.nextAdjustment.deltaPayment >= 0 ? '+' : '−'}${formatCurrency(
					Math.abs(result.nextAdjustment.deltaPayment)
				)} a month at the ${pct(inputs.periodicCap)} cap`}
				verdict={verdictCopy}
				tone={result.verdict === 'exposed' ? 'bad' : result.verdict === 'watch' ? 'warn' : 'good'}
				stats={[
					{
						label: 'Cushion ceiling',
						value: result.cushionBps !== null ? `${result.cushionBps} bps` : 'beyond the cap'
					},
					{ label: 'At the lifetime cap', value: formatCurrency(result.lifetimeCapPayment) },
					{
						label: '+100 bps costs',
						value: `${formatCurrency(result.steps.find((step) => step.bps === 100)?.extraCash12 ?? 0)} a year`
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The line</SectionRule>
					<div className="divide-y divide-ink/10">
						<SelectField
							id="fr-product"
							label="Product"
							value={inputs.product}
							options={PRODUCTS}
							onChange={(value) => set('product', value)}
							hint="A draw-period HELOC is interest-only, so its payment moves one for one with the rate."
						/>
						<MoneyField
							id="fr-balance"
							label="Balance"
							value={inputs.balance}
							step={1000}
							onChange={(value) => set('balance', value)}
						/>
						<RateField
							id="fr-rate"
							label="Rate today"
							value={inputs.currentRate}
							onChange={(value) => set('currentRate', value)}
							hint="Index plus margin, as printed on the statement."
						/>
						<NumberField
							id="fr-months"
							label="Months to the next reset"
							value={inputs.monthsToReset}
							min={0}
							max={120}
							suffix="months"
							onChange={(value) => set('monthsToReset', value)}
						/>
					</div>
				</div>

				<div>
					<SectionRule>The contract</SectionRule>
					<div className="divide-y divide-ink/10">
						<RateField
							id="fr-periodic"
							label="Cap per adjustment"
							value={inputs.periodicCap}
							onChange={(value) => set('periodicCap', value)}
							step={0.25}
							hint="The largest move the contract allows at one reset — 2% on most HELOCs."
						/>
						<RateField
							id="fr-lifetime"
							label="Lifetime ceiling"
							value={inputs.lifetimeCapRate}
							onChange={(value) => set('lifetimeCapRate', value)}
							step={0.5}
							max={40}
							hint="An absolute rate, not a spread. Above this the payment cannot rise, so the engine stops projecting."
						/>
						<NumberField
							id="fr-amort"
							label="Amortization period"
							value={inputs.amortizeMonths}
							min={12}
							max={480}
							step={12}
							suffix="months"
							onChange={(value) => set('amortizeMonths', value)}
							hint="Repayment-phase term for a HELOC, or months remaining on an ARM."
						/>
						<MoneyField
							id="fr-cushion"
							label="Monthly cushion"
							value={inputs.monthlyCushion}
							step={25}
							onChange={(value) => set('monthlyCushion', value)}
							hint="What you could absorb without touching savings or another line of credit."
							badge="solves"
						/>
					</div>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8">
				<Columns
					columns={['Move', 'Rate', 'Payment', 'Change', 'Extra cash, 12 mo']}
					rows={[
						['Today', pct(inputs.currentRate), formatCurrency(result.currentPayment), '—', '—'],
						...result.steps.map((step) => [
							`+${step.bps} bps`,
							pct(step.rate),
							step.blocked ? 'beyond the ceiling' : formatCurrency(step.payment),
							step.blocked ? 'not projected' : `+${formatCurrency(step.deltaPayment)}`,
							step.blocked ? '—' : formatCurrency(step.extraCash12)
						]),
						['Lifetime cap', pct(result.lifetimeCapRate), formatCurrency(result.lifetimeCapPayment), `+${formatCurrency(
							result.lifetimeCapPayment - result.currentPayment
						)}`, formatCurrency((result.lifetimeCapPayment - result.currentPayment) * 12)]
					]}
					caption="A blocked step is a rate the contract forbids. The engine reports the ceiling instead of projecting past it."
				/>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="Where the payment goes"
					rows={[
						{ label: 'Interest-only equivalent', value: `${formatCurrency(result.interestOnlyPayment)} a month` },
						{ label: 'Fully amortizing today', value: `${formatCurrency(result.amortizingPayment)} a month` },
						{
							label: 'Cushion exhausted after',
							value: result.cushionBps !== null ? `${result.cushionBps} bps` : 'the ceiling arrives first',
							emphasis: true
						},
						{
							label: 'Extra cash at +200 bps',
							value: `${formatCurrency(result.steps.find((step) => step.bps === 200)?.extraCash12 ?? 0)} a year`
						}
					]}
					foot="The draw-to-repayment step is a second shock on the same line: interest-only becomes a fully amortizing payment with no rate change at all."
				/>
				<div className="grid content-start gap-4">
					<Note>
						Caps are inputs, not assumptions. Read the note, the rider or the HELOC agreement and type
						what it says; a stress test against caps the contract does not contain is theatre.
					</Note>
					<Note>
						Nothing here is a projection of where rates go. The table is a schedule of what each move
						costs, so the visit can be planned against a number rather than a feeling.
					</Note>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>Figures are monthly cash. Annual columns are twelve of those months, not a projection.</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied'
						? 'Copied'
						: copyState === 'blocked'
							? 'Copy blocked — select the text'
							: 'Copy the scenario'}
				</button>
			</div>
		</div>
	);
}
