import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runRecast, type LoanType, type RecastInputs } from '../../../lib/calculators/recast';
import { MACRO_2026 } from '../../../lib/calculators/data/macro2026';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import {
	Band,
	MoneyField,
	Note,
	NumberField,
	RateField,
	Rows,
	SectionRule,
	SelectField,
	SavePdfButton
} from './ui';

const INITIAL: RecastInputs = {
	balance: 375173,
	noteRate: 0.0325,
	monthsRemaining: 324,
	curtailment: 50000,
	servicerFee: 250,
	marketRate: MACRO_2026.mortgageRate,
	refiClosingShare: 0.03,
	deployReturn: 0.04,
	loanType: 'conventional',
	targetRelief: 400
};

const LOAN_TYPES: Array<{ value: LoanType; label: string }> = [
	{ value: 'conventional', label: 'Conventional' },
	{ value: 'jumbo', label: 'Jumbo' },
	{ value: 'fha', label: 'FHA' },
	{ value: 'va', label: 'VA' },
	{ value: 'usda', label: 'USDA' }
];

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

export default function RecastCalculator() {
	const persisted = usePersistedInputs<RecastInputs>('recast-vs-refinance', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const inputs = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.recastLedger);

	const result = useMemo(() => runRecast(inputs), [inputs]);

	const set = <K extends keyof RecastInputs>(key: K, value: RecastInputs[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const weeks = result.paybackMonths !== null ? Math.max(1, Math.round(result.paybackMonths * 4.33)) : null;

	const verdict = !result.eligible ? (
		<>
			The arithmetic works; the product may not. Your servicer decides whether this loan can be
			re-amortized — the note below tells you what they will say.
		</>
	) : result.reliefMonthly <= 0 ? (
		<>No relief at this curtailment. Raise the lump sum until the payment moves.</>
	) : (
		<>
			{formatCurrency(result.reliefMonthly)} a month, permanent, at a rate no lender will quote you
			today. The fee is back in {weeks} {weeks === 1 ? 'week' : 'weeks'}.
		</>
	);

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Recast vs refinance',
			sourcePath: '/calculators/recast-vs-refinance/',
			verdict:
				result.reliefMonthly > 0
					? `${formatCurrency(result.reliefMonthly)} a month of permanent relief from ${formatCurrency(inputs.curtailment)} curtailed at ${pct(inputs.noteRate)}.`
					: 'No relief modelled at this curtailment.',
			sections: [
				{
					heading: 'The loan',
					rows: [
						['Unpaid principal', formatCurrency(inputs.balance)],
						['Note rate', pct(inputs.noteRate)],
						['Months remaining', String(Math.round(inputs.monthsRemaining))],
						['Loan type', inputs.loanType]
					]
				},
				{
					heading: 'The recast',
					rows: [
						['Curtailment', formatCurrency(inputs.curtailment)],
						['Servicer fee', formatCurrency(inputs.servicerFee)],
						['Payment before', formatCurrency(result.baselinePayment)],
						['Payment after', formatCurrency(result.recastPayment)],
						['Relief', `${formatCurrency(result.reliefMonthly)} a month`],
						['Fee payback', result.paybackMonths ? `${result.paybackMonths.toFixed(2)} months` : 'n/a'],
						['Interest avoided over the term', formatCurrency(result.interestSaved)]
					]
				},
				{
					heading: 'The refinance, for comparison',
					rows: [
						['Market rate', pct(inputs.marketRate)],
						['Payment at the same term', formatCurrency(result.refinance.paymentSameTerm)],
						['Closing costs', formatCurrency(result.refinance.closingCost)],
						[
							'30-year rate needed to match the recast',
							result.refinance.rateToMatchRecast ? pct(result.refinance.rateToMatchRecast) : 'not reachable'
						]
					]
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_recast_packet', clipboard: copied });
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
				eyebrow="Monthly relief"
				figure={formatCurrency(result.reliefMonthly)}
				caption={`permanent, from ${formatCurrency(inputs.curtailment)} curtailed`}
				verdict={verdict}
				tone={!result.eligible ? 'warn' : result.reliefMonthly > 0 ? 'good' : 'bad'}
				stats={[
					{ label: 'Payment after', value: formatCurrency(result.recastPayment) },
					{
						label: 'Fee payback',
						value: result.paybackMonths ? `${result.paybackMonths.toFixed(1)} months` : 'none'
					},
					{ label: 'Interest avoided', value: formatCurrency(result.interestSaved) }
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The loan</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField
							id="rc-balance"
							label="Unpaid principal"
							value={inputs.balance}
							step={1000}
							onChange={(value) => set('balance', value)}
							hint="From your latest statement, not the original note amount."
						/>
						<RateField
							id="rc-rate"
							label="Note rate"
							value={inputs.noteRate}
							onChange={(value) => set('noteRate', value)}
							hint="The rate you locked. A recast does not touch it."
						/>
						<NumberField
							id="rc-months"
							label="Months remaining"
							value={inputs.monthsRemaining}
							min={12}
							max={480}
							step={12}
							suffix="months"
							onChange={(value) => set('monthsRemaining', value)}
							hint="Payment number to the payoff date, divided by twelve if you only know years."
						/>
						<SelectField
							id="rc-type"
							label="Loan type"
							value={inputs.loanType}
							options={LOAN_TYPES}
							onChange={(value) => set('loanType', value)}
							hint="Recasts exist on conventional conforming loans. FHA, VA and USDA do not allow them."
						/>
					</div>
				</div>

				<div>
					<SectionRule>The move</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField
							id="rc-curtail"
							label="Lump sum to principal"
							value={inputs.curtailment}
							step={5000}
							onChange={(value) => set('curtailment', value)}
							hint="Curtailment, not prepayment: the servicer re-amortizes instead of shortening the term."
						/>
						<MoneyField
							id="rc-fee"
							label="Servicer fee"
							value={inputs.servicerFee}
							step={50}
							onChange={(value) => set('servicerFee', value)}
							hint="Typically $150 to $500, flat, with no appraisal and no underwriting."
						/>
						<MoneyField
							id="rc-target"
							label="Relief you want"
							value={inputs.targetRelief}
							step={25}
							onChange={(value) => set('targetRelief', value)}
							hint="The inverse of the headline: the engine solves for the lump sum that buys this."
							badge="solves"
						/>
						<div className="py-4">
							<Rows
								rows={[
									{
										label: 'Lump sum needed for that relief',
										value: formatCurrency(result.curtailmentForTarget),
										emphasis: true
									},
									{
										label: 'Shortfall against the sum above',
										value: result.targetShortfall > 0 ? formatCurrency(result.targetShortfall) : 'covered'
									}
								]}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="The recast, line by line"
					rows={[
						{ label: 'Payment today', value: formatCurrency(result.baselinePayment) },
						{ label: 'Principal after the lump sum', value: formatCurrency(result.newBalance) },
						{ label: 'Payment after re-amortizing', value: formatCurrency(result.recastPayment) },
						{ label: 'Relief a month', value: formatCurrency(result.reliefMonthly), emphasis: true },
						{ label: 'Relief a year', value: formatCurrency(result.reliefAnnual) },
						{ label: 'Term left', value: `${Math.round(inputs.monthsRemaining)} months, unchanged` }
					]}
					foot="The term does not move. That is the difference between a recast and a refinance, and it is why the note rate survives."
				/>

				<div>
					<Rows
						title="The refinance, priced"
						rows={[
							{ label: `Market rate (${MACRO_2026.asOf})`, value: pct(inputs.marketRate) },
							{ label: 'Payment at the same term', value: formatCurrency(result.refinance.paymentSameTerm) },
							{
								label: 'Change against today',
								value: `${result.refinance.paymentDeltaSameTerm >= 0 ? '+' : '−'}${formatCurrency(Math.abs(result.refinance.paymentDeltaSameTerm))}`
							},
							{ label: 'Closing costs at closing', value: formatCurrency(result.refinance.closingCost) },
							{
								label: '30-year rate that matches the recast',
								value: result.refinance.rateToMatchRecast ? pct(result.refinance.rateToMatchRecast) : 'not reachable',
								emphasis: true
							}
						]}
						foot="A 30-year refinance resets the clock, which is where most of its payment relief comes from — not from the rate. The last row is the rate that would have to exist for the refinance to match the recast on payment."
					/>
					<div className="mt-6">
						<Note>
							Deploying the same {formatCurrency(result.deployment.invested)} at{' '}
							{(inputs.deployReturn * 100).toFixed(1)}% for {result.deployment.years} years grows by{' '}
							{formatCurrency(result.deployment.investedGain)} before tax. Curtailing it returns{' '}
							{formatCurrency(result.deployment.guaranteedGain)} over the same window, tax-free, because it
							is interest you never pay.
						</Note>
					</div>
				</div>
			</div>

			{result.gates.length > 0 ? (
				<div className="border-t border-ink/15 bg-paper-2/60 px-6 py-5 sm:px-8">
					<p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ink-2">
						Read before calling the servicer
					</p>
					<ul className="mt-2.5 grid gap-2">
						{result.gates.map((gate) => (
							<li key={gate} className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink-2">
								<span aria-hidden="true" className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-ink-2" />
								<span>{gate}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					Market rate and closing-cost share are defaults you can overwrite. Everything else is
					arithmetic on your own figures.
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
							: 'Copy the scenario'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} />
			</div>
		</div>
	);
}
