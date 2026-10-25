import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runDownPayment, type DownPaymentInputs } from '../../../lib/calculators/downPayment';
import { MACRO_2026 } from '../../../lib/calculators/data/macro2026';
import { DPA_PROGRAMS, coveredStates } from '../../../lib/calculators/data/dpaPrograms';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SavePdfButton } from './ui';

interface FormState {
	price: number;
	rate: number;
	termMonths: number;
	closingCostShare: number;
	reserveTarget: number;
	tierA: number;
	tierB: number;
	tierC: number;
	assistanceAmount: number;
	assistanceSurcharge: number;
	forgiven: boolean;
	yearsToHold: number;
}

const INITIAL: FormState = {
	price: MACRO_2026.medianExistingPrice,
	rate: MACRO_2026.mortgageRate,
	termMonths: 360,
	closingCostShare: 0.02,
	reserveTarget: 25000,
	tierA: 0.03,
	tierB: 0.1,
	tierC: 0.2,
	assistanceAmount: 15000,
	assistanceSurcharge: 0.0025,
	forgiven: true,
	yearsToHold: 7
};

const program = DPA_PROGRAMS[0];

export default function DownPaymentCalculator() {
	const persisted = usePersistedInputs<FormState>('down-payment', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.downPayment);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const inputs: DownPaymentInputs = useMemo(
		() => ({
			price: form.price,
			rate: form.rate,
			termMonths: form.termMonths,
			tiers: [form.tierA, form.tierB, form.tierC],
			closingCostShare: form.closingCostShare,
			reserveTarget: form.reserveTarget,
			assistance: { amount: form.assistanceAmount, rateSurcharge: form.assistanceSurcharge, forgiven: form.forgiven },
			yearsToHold: form.yearsToHold
		}),
		[form]
	);

	const result = useMemo(() => runDownPayment(inputs), [inputs]);
	const recommended = result.tiers.find((tier) => tier.downShare === result.recommended) ?? result.tiers[0];

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Down payment and mortgage insurance',
			sourcePath: '/calculators/down-payment/',
			verdict: recommended
				? `${(recommended.downShare * 100).toFixed(0)}% down clears the reserve target with ${formatCurrency(
						recommended.cashLeftAfterClosing
					)} left over.`
				: 'No tier clears the reserve target.',
			sections: [
				{
					heading: 'The loan',
					rows: [
						['Price', formatCurrency(form.price)],
						['Rate', `${(form.rate * 100).toFixed(2)}%`],
						['Closing costs', `${(form.closingCostShare * 100).toFixed(1)}% of price`],
						['Reserve target', formatCurrency(form.reserveTarget)],
						['Hold', `${form.yearsToHold} years`]
					]
				},
				{
					heading: 'Tiers',
					rows: result.tiers.map((tier) => [
						`${(tier.downShare * 100).toFixed(0)}% down`,
						`${formatCurrency(tier.paymentWithMi)} a month, ${formatCurrency(tier.cumulativeMiOverHold)} of MI`
					])
				},
				{
					heading: 'Assistance',
					rows: [
						['Amount', formatCurrency(result.assistance.amount)],
						['Cost of the rate surcharge', formatCurrency(result.assistance.costOfSurcharge)],
						['Net benefit', formatCurrency(result.assistance.netBenefit)],
						['Verdict', result.assistance.verdict]
					]
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_down_payment_packet', clipboard: copied });
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
				eyebrow="Cash left above your reserve target"
				figure={recommended ? formatCurrency(recommended.cashLeftAfterClosing) : '—'}
				caption={
					recommended
						? `at ${(recommended.downShare * 100).toFixed(0)}% down, after ${formatCurrency(
								recommended.downCash
							)} down and ${formatCurrency(form.price * form.closingCostShare)} of closing costs`
						: 'no tier clears the target'
				}
				verdict={
					recommended ? (
						<>
							{formatCurrency(recommended.paymentWithMi)} a month, including{' '}
							{formatCurrency(recommended.monthlyMi)} of mortgage insurance that stops at month{' '}
							{recommended.cancellationMonth ?? 0}. Total premium over {form.yearsToHold} years:{' '}
							{formatCurrency(recommended.cumulativeMiOverHold)}.
						</>
					) : (
						<>Every tier spends more cash than the reserve target allows. Lower the target or the price.</>
					)
				}
				tone={recommended ? 'good' : 'warn'}
				stats={[
					{ label: 'Loan at that tier', value: formatCurrency(recommended?.loan ?? 0) },
					{ label: 'MI a month', value: formatCurrency(recommended?.monthlyMi ?? 0) },
					{ label: 'MI cancels', value: recommended?.cancellationMonth ? `month ${recommended.cancellationMonth}` : 'none' }
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The loan</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="dp-price" label="Purchase price" value={form.price} step={5000} onChange={(value) => set('price', value)} />
						<RateField id="dp-rate" label="Mortgage rate" value={form.rate} onChange={(value) => set('rate', value)} />
						<RateField id="dp-closing" label="Closing costs" value={form.closingCostShare} onChange={(value) => set('closingCostShare', value)} step={0.25} hint="Share of price, paid in cash alongside the down payment." />
						<MoneyField
							id="dp-reserve"
							label="Reserves to keep"
							value={form.reserveTarget}
							step={1000}
							onChange={(value) => set('reserveTarget', value)}
							hint="Liquid cash you want left after closing. The recommendation respects it."
						/>
						<NumberField id="dp-hold" label="Years before selling" value={form.yearsToHold} min={1} max={30} suffix="years" onChange={(value) => set('yearsToHold', value)} hint="How long the premium is charged before the loan is repaid." />
					</div>
				</div>

				<div>
					<SectionRule>The tiers</SectionRule>
					<div className="divide-y divide-ink/10">
						<RateField id="dp-a" label="Tier one" value={form.tierA} onChange={(value) => set('tierA', Math.min(1, value))} step={0.5} max={100} />
						<RateField id="dp-b" label="Tier two" value={form.tierB} onChange={(value) => set('tierB', Math.min(1, value))} step={0.5} max={100} />
						<RateField id="dp-c" label="Tier three" value={form.tierC} onChange={(value) => set('tierC', Math.min(1, value))} step={0.5} max={100} />
					</div>
				</div>
			</div>

			<div className="grid gap-px border-t border-ink/15 bg-ink/10 sm:grid-cols-3">
				{result.tiers.map((tier) => {
					const isPick = tier.downShare === result.recommended;
					return (
						<div key={tier.downShare} className={`grid content-start gap-3 p-6 ${isPick ? 'bg-pine text-paper' : 'bg-card text-ink'}`}>
							<div className="flex items-baseline justify-between gap-2">
								<p className={`text-[0.72rem] uppercase tracking-[0.16em] ${isPick ? 'text-paper/70' : 'text-ink-2'}`}>
									{(tier.downShare * 100).toFixed(0)}% down
								</p>
								{isPick ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-paper/70">Fits</span> : null}
							</div>
							<p className={`figure text-[1.85rem] ${isPick ? 'text-paper' : 'text-ink'}`}>{formatCurrency(tier.paymentWithMi)}</p>
							<p className={`text-[0.75rem] ${isPick ? 'text-paper/70' : 'text-ink-2'}`}>
								{formatCurrency(tier.downCash)} down · LTV {(tier.ltv * 100).toFixed(0)}%
							</p>
							<dl className={`mt-1 grid gap-1.5 border-t pt-3 text-[0.78rem] ${isPick ? 'border-paper/20' : 'border-ink/15'}`}>
								<div className="flex justify-between gap-3">
									<dt className={isPick ? 'text-paper/70' : 'text-ink-2'}>Mortgage insurance</dt>
									<dd className="num">{tier.miRate > 0 ? `${(tier.miRate * 100).toFixed(2)}%` : 'none'}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isPick ? 'text-paper/70' : 'text-ink-2'}>Premium a month</dt>
									<dd className="num">{formatCurrency(tier.monthlyMi)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isPick ? 'text-paper/70' : 'text-ink-2'}>Premium over hold</dt>
									<dd className="num">{formatCurrency(tier.cumulativeMiOverHold)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isPick ? 'text-paper/70' : 'text-ink-2'}>Cancels at</dt>
									<dd className="num">{tier.cancellationMonth ? `month ${tier.cancellationMonth}` : '—'}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isPick ? 'text-paper/70' : 'text-ink-2'}>Cash after closing</dt>
									<dd className="num">{formatCurrency(tier.cashLeftAfterClosing)}</dd>
								</div>
							</dl>
						</div>
					);
				})}
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="Why the premium exists"
					rows={[
						{ label: 'Loan at the recommended tier', value: formatCurrency(recommended?.loan ?? 0) },
						{ label: 'Requested cancellation at 80% LTV', value: recommended?.cancellationMonth ? `month ${recommended.cancellationMonth}` : '—' },
						{ label: 'Automatic termination at 78% LTV', value: recommended?.terminationMonth ? `month ${recommended.terminationMonth}` : '—' },
						{ label: 'Premium over the hold', value: formatCurrency(recommended?.cumulativeMiOverHold ?? 0) }
					]}
					foot="Cancellation at 80% requires a request and a current valuation. Termination at 78% is automatic. A rising market can pull either date forward — a lower one cannot."
				/>

				<div>
					<Rows
						title="Assistance, priced"
						rows={[
							{ label: 'Assistance amount', value: formatCurrency(form.assistanceAmount) },
							{
								label: 'Rate surcharge on the first lien',
								value: `${(form.assistanceSurcharge * 100).toFixed(2)}% a year`
							},
							{ label: `Cost of the surcharge, ${form.yearsToHold} years`, value: formatCurrency(result.assistance.costOfSurcharge) },
							{ label: 'Net benefit', value: formatCurrency(result.assistance.netBenefit), emphasis: true }
						]}
					/>
					<div className="mt-4 grid gap-3">
						<Choice
							label="Form of assistance"
							value={form.forgiven ? 'forgiven' : 'repayable'}
							options={[
								{ value: 'forgiven' as const, label: 'Forgivable or grant' },
								{ value: 'repayable' as const, label: 'Second lien, repaid' }
							]}
							onChange={(value) => {
								set('forgiven', value === 'forgiven');
								onInputChange('forgiven');
							}}
						/>
						<RateField
							id="dp-surcharge"
							label="Assistance rate surcharge"
							value={form.assistanceSurcharge}
							onChange={(value) => set('assistanceSurcharge', value)}
							step={0.125}
							hint="The extra rate on the first lien when it is paired with assistance."
						/>
						<Note>
							Covered states at launch: {coveredStates().join(', ')} — {program.name}, run by {program.agency}.
							Program terms change with each funding round, so the figures above are yours to enter from the
							offer letter.
						</Note>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>Mortgage insurance rates are seeded bands, not quotes. Your lender's rate sheet is the authority.</Note>
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
