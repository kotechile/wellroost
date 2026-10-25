import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { calculateMonthlyPayment } from '../../../lib/calculators/amortization';
import { formatCurrency } from '../../../lib/calculators/format';
import { runFloatingRate, type FloatingProduct, type FloatingRateInputs } from '../../../lib/calculators/floatingRate';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Columns, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SavePdfButton } from './ui';

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

const PRODUCTS: Array<{ value: FloatingProduct; label: string; desc: string }> = [
	{
		value: 'heloc-draw',
		label: 'HELOC (Draw Phase)',
		desc: 'Revolving line of credit. Interest-only payments (typically first 10 years).'
	},
	{
		value: 'heloc-repay',
		label: 'HELOC (Repayment Phase)',
		desc: 'Draw period ended. Full principal + interest repayment (typically 10–20 years).'
	},
	{
		value: 'arm',
		label: 'ARM (Adjustable Mortgage)',
		desc: 'First mortgage installment loan. Fixed initially, now adjusting periodically.'
	}
];

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
const formatBpsAsPct = (bps: number) => `+${(bps / 100).toFixed(2)}% (${bps} bps)`;

export default function FloatingRateCalculator() {
	const persisted = usePersistedInputs<FloatingRateInputs>('heloc-arm-stress', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const inputs = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const [showRepaymentCol, setShowRepaymentCol] = useState<boolean>(true);
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.floatingRate);

	const result = useMemo(() => runFloatingRate(inputs), [inputs]);

	const set = <K extends keyof FloatingRateInputs>(key: K, value: FloatingRateInputs[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const verdictCopy =
		result.verdict === 'exposed'
			? `High Risk: One scheduled reset (+${(inputs.periodicCap * 100).toFixed(2)}%) will completely wipe out your monthly budget buffer.`
			: result.verdict === 'watch'
				? `Moderate Risk: Your budget buffer can absorb one reset, but a second hike will create a monthly deficit.`
				: `Protected: Your budget buffer covers at least two rate resets before becoming negative.`;

	const cushionDisplay =
		result.cushionBps !== null
			? `+${(result.cushionBps / 100).toFixed(2)}% (${result.cushionBps} bps)`
			: 'Protected to lifetime cap';

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Floating-rate stress test',
			sourcePath: '/calculators/heloc-arm-stress/',
			verdict:
				result.cushionBps !== null
					? `A rate increase of +${(result.cushionBps / 100).toFixed(2)}% (${result.cushionBps} bps) exhausts your ${formatCurrency(inputs.monthlyCushion)} monthly cushion.`
					: 'Your monthly cushion survives all rate increases up to the lifetime contract ceiling.',
			sections: [
				{
					heading: 'Loan details',
					rows: [
						['Loan type', PRODUCTS.find((item) => item.value === inputs.product)?.label ?? inputs.product],
						['Balance', formatCurrency(inputs.balance)],
						['Current interest rate', pct(inputs.currentRate)],
						['Payment today', formatCurrency(result.currentPayment)],
						['Months to next reset', `${inputs.monthsToReset} months`],
						['Lifetime interest ceiling', pct(inputs.lifetimeCapRate)],
						['Monthly budget buffer', formatCurrency(inputs.monthlyCushion)]
					]
				},
				{
					heading: 'Rate increase schedule',
					rows: result.steps.map((step) => [
						`+${(step.bps / 100).toFixed(2)}% (+${step.bps} bps) &rarr; ${pct(step.rate)}`,
						step.blocked
							? 'Capped by lifetime ceiling'
							: `${formatCurrency(step.payment)}/mo (+${formatCurrency(step.deltaPayment)}/mo)`
					])
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_floating_rate_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	const savePdf = () => {
		const opened = saveScenarioPacketAsPdf(buildPacket());
		setPdfState(opened ? 'opened' : 'blocked');
		onComplete({ action: 'save_pdf', printed: opened });
		window.setTimeout(() => setPdfState('idle'), 2400);
	};

	const isHelocDraw = inputs.product === 'heloc-draw';

	return (
		<div>
			{/* 1. CONCEPTUAL ANCHOR: Product Selector with Plain English Breakdown */}
			<div className="border-b border-ink/15 bg-paper/60 p-6 sm:p-8">
				<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-ink-muted">Step 1 &middot; Loan Type</p>
				<h3 className="mt-1 text-base font-bold text-ink sm:text-lg">What kind of adjustable balance do you have?</h3>
				<p className="mt-1 text-xs text-ink-muted sm:text-sm">
					Select your loan structure to apply the correct interest-only vs. amortizing math.
				</p>

				{/* Basic Concepts Explainer */}
				<div className="mt-3.5 rounded-lg border border-ink/10 bg-surface/70 p-3.5 text-xs leading-relaxed text-ink-2">
					<p>
						<strong className="font-semibold text-ink">Basic concepts:</strong> A HELOC (Home Equity Line of Credit) is a revolving second mortgage that lets you borrow against your home equity as needed. In contrast, an ARM (Adjustable-Rate Mortgage) is a primary home loan with a fixed rate for an initial period that later adjusts periodically.
						<span className="ml-1.5 inline-flex flex-wrap gap-1 font-mono text-[0.72rem] text-pine">
							[
							<a href="https://www.youtube.com/watch?v=92JJKt7avX4" target="_blank" rel="noopener noreferrer" className="underline hover:text-pine-deep" title="HELOC vs ARM Overview (YouTube)">1</a>,{' '}
							<a href="https://www.freedommortgage.com/learn/home-equity/heloc-vs-mortgage" target="_blank" rel="noopener noreferrer" className="underline hover:text-pine-deep" title="HELOC vs Mortgage (Freedom Mortgage)">2</a>,{' '}
							<a href="https://www.pennymac.com/blog/heloc-home-equity-line-of-credit" target="_blank" rel="noopener noreferrer" className="underline hover:text-pine-deep" title="HELOC Basics (Pennymac)">3</a>,{' '}
							<a href="https://www.loandepot.com/learning-center/home-equity/heloc-vs-heloan-which-home-equity-option-is-right-for-you" target="_blank" rel="noopener noreferrer" className="underline hover:text-pine-deep" title="Home Equity Options (loanDepot)">4</a>,{' '}
							<a href="https://www.lendmire.com/heloc-for-a-homeowner-with-an-arm/" target="_blank" rel="noopener noreferrer" className="underline hover:text-pine-deep" title="HELOC with an ARM (Lendmire)">5</a>
							]
						</span>
					</p>
				</div>

				<div className="mt-4 grid gap-3 sm:grid-cols-3">
					{PRODUCTS.map((prod) => {
						const active = inputs.product === prod.value;
						return (
							<button
								key={prod.value}
								type="button"
								onClick={() => set('product', prod.value)}
								className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
									active
										? 'border-pine bg-surface shadow-sm ring-2 ring-pine/20'
										: 'border-ink/15 bg-surface/40 hover:border-ink/30 hover:bg-surface'
								}`}
							>
								<div>
									<div className="flex items-center justify-between">
										<span className={`text-sm font-bold ${active ? 'text-pine' : 'text-ink'}`}>
											{prod.label}
										</span>
										{active && (
											<span className="h-2 w-2 rounded-full bg-pine" aria-hidden="true" />
										)}
									</div>
									<p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
										{prod.desc}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. THE ANSWER BAND */}
			<Band
				eyebrow="Payment after the next scheduled reset"
				figure={formatCurrency(result.nextAdjustment.payment)}
				caption={`${result.nextAdjustment.deltaPayment >= 0 ? '+' : '−'}${formatCurrency(
					Math.abs(result.nextAdjustment.deltaPayment)
				)} a month at your ${(inputs.periodicCap * 100).toFixed(2)}% cap`}
				verdict={verdictCopy}
				tone={result.verdict === 'exposed' ? 'bad' : result.verdict === 'watch' ? 'warn' : 'good'}
				stats={[
					{
						label: 'Rate hike wiping out buffer',
						value: cushionDisplay
					},
					{ label: 'Payment at lifetime ceiling', value: formatCurrency(result.lifetimeCapPayment) },
					{
						label: '+1.00% (+100 bps) costs',
						value: `${formatCurrency(result.steps.find((step) => step.bps === 100)?.extraCash12 ?? 0)} a year`
					}
				]}
			/>

			{/* 3. GUIDED INPUTS WITH PLAIN-LANGUAGE LABELS */}
			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>Current Loan Details</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField
							id="fr-balance"
							label="Current loan balance"
							value={inputs.balance}
							step={1000}
							onChange={(value) => set('balance', value)}
							hint="Total balance owed today, as printed on your monthly statement."
						/>
						<RateField
							id="fr-rate"
							label="Current interest rate"
							value={inputs.currentRate}
							onChange={(value) => set('currentRate', value)}
							hint="Your interest rate on page 1 of your statement (base index like Prime/SOFR plus lender's margin)."
						/>
						<NumberField
							id="fr-months"
							label="Months until next rate adjustment"
							value={inputs.monthsToReset}
							min={0}
							max={120}
							suffix="months"
							onChange={(value) => set('monthsToReset', value)}
							hint="HELOCs adjust monthly (1 mo); ARMs typically adjust every 6 or 12 months."
						/>
						<MoneyField
							id="fr-cushion"
							label="Monthly budget buffer"
							value={inputs.monthlyCushion}
							step={25}
							onChange={(value) => set('monthlyCushion', value)}
							hint="Extra cash you can afford per month before a rate hike cuts into savings or living expenses."
						/>
					</div>
				</div>

				<div>
					<SectionRule>Contract Limits & Caps</SectionRule>
					<div className="divide-y divide-ink/10">
						<RateField
							id="fr-periodic"
							label="Max increase per reset (periodic cap)"
							value={inputs.periodicCap}
							onChange={(value) => set('periodicCap', value)}
							step={0.25}
							hint="The largest rate jump your note allows in a single reset (most commonly 2.00% = 200 bps)."
						/>
						<RateField
							id="fr-lifetime"
							label="Lifetime maximum rate ceiling"
							value={inputs.lifetimeCapRate}
							onChange={(value) => set('lifetimeCapRate', value)}
							step={0.5}
							max={40}
							hint="The absolute legal maximum rate in your contract (e.g. 18.00%). The rate can never exceed this."
						/>
						<NumberField
							id="fr-amort"
							label="Repayment payoff period"
							value={inputs.amortizeMonths}
							min={12}
							max={480}
							step={12}
							suffix="months"
							onChange={(value) => set('amortizeMonths', value)}
							hint="Repayment term once draw ends (typically 240 months = 20 years), or remaining ARM term."
						/>
					</div>
				</div>
			</div>

			{/* 4. STRESS SCHEDULE WITH PAYMENT SHOCK REPAYMENT TOGGLE */}
			<div className="grid gap-x-12 gap-y-4 border-t border-ink/15 p-6 sm:p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h4 className="font-bold text-ink">Rate Increase Stress Schedule</h4>
						<p className="text-xs text-ink-muted">
							Comparing payment shock across 4 standard rate movement scenarios.
						</p>
					</div>
					{isHelocDraw && (
						<button
							type="button"
							onClick={() => setShowRepaymentCol(!showRepaymentCol)}
							className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:border-ink/40"
						>
							<span className={`h-2 w-2 rounded-full ${showRepaymentCol ? 'bg-pine' : 'bg-ink/30'}`} />
							{showRepaymentCol ? 'Hide Repayment Phase Shock' : 'Show Repayment Phase Shock (Draw Ends)'}
						</button>
					)}
				</div>

				<Columns
					columns={
						isHelocDraw && showRepaymentCol
							? ['Rate move', 'New rate', 'Current draw payment', 'When repayment begins (P+I)', 'Extra cash / year']
							: ['Rate move', 'New rate', 'Monthly payment', 'Monthly change', 'Extra cash / year']
					}
					rows={[
						[
							'Today',
							pct(inputs.currentRate),
							formatCurrency(result.currentPayment),
							isHelocDraw && showRepaymentCol ? formatCurrency(result.amortizingPayment) : '—',
							'—'
						],
						...result.steps.map((step) => {
							const moveLabel = `+${(step.bps / 100).toFixed(2)}% (+${step.bps} bps)`;
							const rateLabel = pct(step.rate);
							const paymentCol = step.blocked ? 'Beyond lifetime cap' : formatCurrency(step.payment);
							const repaymentOrDelta = isHelocDraw && showRepaymentCol
								? (step.blocked ? 'Beyond lifetime cap' : formatCurrency(step.repaymentPayment))
								: (step.blocked ? 'Not projected' : `+${formatCurrency(step.deltaPayment)}/mo`);
							const annualCol = step.blocked ? '—' : formatCurrency(step.extraCash12);

							return [moveLabel, rateLabel, paymentCol, repaymentOrDelta, annualCol];
						}),
						[
							'Lifetime legal cap',
							pct(result.lifetimeCapRate),
							formatCurrency(result.lifetimeCapPayment),
							isHelocDraw && showRepaymentCol
								? formatCurrency(calculateMonthlyPayment(inputs.balance, result.lifetimeCapRate, inputs.amortizeMonths))
								: `+${formatCurrency(result.lifetimeCapPayment - result.currentPayment)}/mo`,
							formatCurrency((result.lifetimeCapPayment - result.currentPayment) * 12)
						]
					]}
					caption={
						isHelocDraw && showRepaymentCol
							? 'When your 10-year HELOC draw ends, interest-only ends and principal repayment begins. Notice the repayment payment jumps significantly even at today’s rate.'
							: 'A blocked step is a rate higher than your contract’s legal lifetime ceiling. We report the ceiling rather than projecting illegal rates.'
					}
				/>
			</div>

			{/* 5. WHERE THE PAYMENT GOES & DRAW-TO-REPAYMENT COMPARISON */}
			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="Payment Structure Today"
					rows={[
						{
							label: 'Interest-only draw payment',
							value: `${formatCurrency(result.interestOnlyPayment)} / month`
						},
						{
							label: 'Principal + interest (repayment phase)',
							value: `${formatCurrency(result.amortizingPayment)} / month`,
							emphasis: isHelocDraw
						},
						{
							label: 'Budget buffer exhausted at',
							value: cushionDisplay,
							emphasis: true
						},
						{
							label: 'Annual cash needed at +2.00% (+200 bps)',
							value: `${formatCurrency(result.steps.find((step) => step.bps === 200)?.extraCash12 ?? 0)} / year`
						}
					]}
					foot="Notice the difference between the first two rows: when a HELOC draw period closes, your payment automatically transitions from interest-only to fully amortizing, causing a second payment shock."
				/>

				{/* 6. ACTIONABLE NEXT STEPS: THE DECISION TREE */}
				<div className="grid content-start gap-4">
					<h4 className="font-bold text-ink">Action Plan If Rates Increase</h4>
					<div className="rounded-xl border border-ink/15 bg-surface/50 p-4">
						<p className="text-xs font-bold uppercase tracking-wider text-pine">Option 1 &middot; Fixed-Rate Lock</p>
						<p className="mt-1 text-xs leading-relaxed text-ink-muted">
							Many lenders (e.g. Chase, Bank of America, Figure) allow you to lock in some or all of your variable HELOC balance into a fixed-rate installment bucket for a small fee ($0–$100).
						</p>
					</div>
					<div className="rounded-xl border border-ink/15 bg-surface/50 p-4">
						<p className="text-xs font-bold uppercase tracking-wider text-pine">Option 2 &middot; Paydown Target Before Repayment</p>
						<p className="mt-1 text-xs leading-relaxed text-ink-muted">
							If you have remaining draw months, paying an extra $100–$250/month directly toward principal lowers the balance before full amortization kicks in.
						</p>
					</div>
					<div className="rounded-xl border border-ink/15 bg-surface/50 p-4">
						<p className="text-xs font-bold uppercase tracking-wider text-pine">Option 3 &middot; Fixed Home Equity Refinance</p>
						<p className="mt-1 text-xs leading-relaxed text-ink-muted">
							If rate reset risk exceeds your monthly buffer, refinance the line into a closed-end fixed second mortgage with set monthly payments.
						</p>
					</div>
				</div>
			</div>

			{/* 7. EXPORT & COPY CONTROLS */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					Calculations represent monthly cash outflow. Basis points are converted to percentage rates (100 bps = 1.00%).
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied'
						? 'Copied to clipboard'
						: copyState === 'blocked'
							? 'Copy blocked — select text'
							: 'Copy scenario summary'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} />
			</div>
		</div>
	);
}
