import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runConcession, type ConcessionInputs } from '../../../lib/calculators/concessionBuydown';
import { MACRO_2026 } from '../../../lib/calculators/data/macro2026';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, MoneyField, Note, NumberField, RateField, Rows, SectionRule } from './ui';

interface FormState extends ConcessionInputs {}

const INITIAL: FormState = {
	price: MACRO_2026.medianExistingPrice,
	downShare: 0.1,
	noteRate: MACRO_2026.mortgageRate,
	credit: 20000,
	holdMonths: 60,
	refiCreditsPayoff: true,
	bpsPerPoint: 25,
	effectiveTaxRate: 0.011
};

const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

export default function ConcessionCalculator() {
	const persisted = usePersistedInputs<FormState>('seller-concession', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.concessionArb);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const result = useMemo(() => runConcession(form), [form]);
	const winner = result.paths[result.best === 'price-cut' ? 'priceCut' : result.best === 'points' ? 'points' : 'buydown'];

	const cards = [
		{
			id: 'price-cut' as const,
			path: result.paths.priceCut,
			net: result.netCost.priceCut,
			sub: `Loan ${formatCurrency(result.paths.priceCut.loan)}`
		},
		{
			id: 'points' as const,
			path: result.paths.points,
			net: result.netCost.points,
			sub: `${((form.credit / (form.price * (1 - form.downShare))) * 100).toFixed(2)} points`
		},
		{
			id: 'buydown' as const,
			path: result.paths.buydown,
			net: result.netCost.buydown,
			sub: `Escrow ${formatCurrency(result.paths.buydown.escrowCost)}`
		}
	];

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Seller concession, three paths',
			sourcePath: '/calculators/seller-concession/',
			verdict: `Cheapest over ${form.holdMonths} months: ${winner.label.toLowerCase()} at ${formatCurrency(winner.payment)} a month.`,
			sections: [
				{
					heading: 'The deal',
					rows: [
						['Price', formatCurrency(form.price)],
						['Down payment', `${(form.downShare * 100).toFixed(0)}%`],
						['Note rate', pct(form.noteRate)],
						['Concession', formatCurrency(form.credit)],
						['Hold period', `${form.holdMonths} months`]
					]
				},
				{
					heading: 'The three paths',
					rows: cards.map((card) => [
						card.path.label,
						`${formatCurrency(card.path.payment)} a month, ${formatCurrency(card.net)} over the hold`
					])
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_concession_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Cheapest of the three"
				figure={formatCurrency(winner.payment)}
				caption={`${winner.label.toLowerCase()}, a month`}
				verdict={
					<>
						Over {form.holdMonths} months the {winner.label.toLowerCase()} nets {formatCurrency(
							result.netCost[result.best === 'price-cut' ? 'priceCut' : result.best]
						)} against {formatCurrency(
							Math.max(result.netCost.priceCut, result.netCost.points, result.netCost.buydown)
						)}{' '}
						for the most expensive path.
					</>
				}
				tone="good"
				stats={[
					{ label: 'Five-year cash', value: formatCurrency(winner.cashOverHold) },
					{ label: 'Tax over the hold', value: formatCurrency(winner.taxOverHold) },
					{
						label: 'Credit left over',
						value: formatCurrency(result.paths.buydown.excessCredit)
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The deal</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="sc-price" label="Purchase price" value={form.price} step={5000} onChange={(value) => set('price', value)} />
						<RateField id="sc-down" label="Down payment" value={form.downShare} onChange={(value) => set('downShare', Math.min(1, value))} step={0.5} max={100} />
						<RateField id="sc-rate" label="Note rate" value={form.noteRate} onChange={(value) => set('noteRate', value)} />
						<MoneyField id="sc-credit" label="Seller credit" value={form.credit} step={1000} onChange={(value) => set('credit', value)} />
					</div>
				</div>
				<div>
					<SectionRule>The terms</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="sc-hold" label="Hold before refinance or sale" value={form.holdMonths} min={6} max={360} step={6} suffix="months" onChange={(value) => set('holdMonths', value)} />
						<RateField id="sc-tax" label="Effective property tax" value={form.effectiveTaxRate} onChange={(value) => set('effectiveTaxRate', value)} step={0.01} hint="A price cut lowers the basis the county assesses." />
						<NumberField id="sc-bps" label="Basis points per point" value={form.bpsPerPoint} min={10} max={50} onChange={(value) => set('bpsPerPoint', value)} hint="The lender's actual bid. The curve flattens past two points." />
						<Choice
							label="Buydown agreement"
							value={form.refiCreditsPayoff ? 'credit' : 'forfeit'}
							options={[
								{ value: 'credit' as const, label: 'Credits payoff' },
								{ value: 'forfeit' as const, label: 'Returns to funder' }
							]}
							onChange={(value) => {
								set('refiCreditsPayoff', value === 'credit');
								onInputChange('refiCreditsPayoff');
							}}
						/>
					</div>
					<div className="pt-4">
						<Note>
							Fannie Mae's guide credits unused buydown funds against the payoff — or returns them to
							whichever party funded the account, depending on the agreement. Ask for that sentence in
							writing before closing; it is worth thousands on an early refinance.
						</Note>
					</div>
				</div>
			</div>

			<div className="grid gap-px border-t border-ink/15 bg-ink/10 sm:grid-cols-3">
				{cards.map((card) => {
					const isWinner = card.id === result.best;
					return (
						<div key={card.id} className={`grid content-start gap-3 p-6 ${isWinner ? 'bg-pine text-paper' : 'bg-card text-ink'}`}>
							<div className="flex items-baseline justify-between gap-2">
								<p className={`text-[0.72rem] uppercase tracking-[0.16em] ${isWinner ? 'text-paper/70' : 'text-ink-2'}`}>
									{card.path.label}
								</p>
								{isWinner ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-paper/70">Cheapest</span> : null}
							</div>
							<p className={`figure text-[1.9rem] ${isWinner ? 'text-paper' : 'text-ink'}`}>{formatCurrency(card.path.payment)}</p>
							<p className={`text-[0.75rem] ${isWinner ? 'text-paper/70' : 'text-ink-2'}`}>{card.sub}</p>
							<dl className={`mt-1 grid gap-1.5 border-t pt-3 text-[0.78rem] ${isWinner ? 'border-paper/20' : 'border-ink/15'}`}>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Cash over hold</dt>
									<dd className="num">{formatCurrency(card.path.cashOverHold)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Tax over hold</dt>
									<dd className="num">{formatCurrency(card.path.taxOverHold)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Net</dt>
									<dd className="num font-semibold">{formatCurrency(card.net)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>If you refinance</dt>
									<dd className="num">{card.path.payoffCredit > 0 ? formatCurrency(card.path.payoffCredit) : card.path.sunk ? 'sunk' : '—'}</dd>
								</div>
							</dl>
							<p className={`text-[0.72rem] leading-snug ${isWinner ? 'text-paper/65' : 'text-ink-2/85'}`}>{card.path.note}</p>
						</div>
					);
				})}
			</div>

			<div className="grid gap-x-12 gap-y-8 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="The 2-1 buydown, inside out"
					rows={[
						{ label: 'Year one payment', value: formatCurrency(result.paths.buydown.yearOne) },
						{ label: 'Year two payment', value: formatCurrency(result.paths.buydown.yearTwo) },
						{ label: 'Year three payment', value: formatCurrency(result.paths.buydown.yearThree), hint: 'Back to the note rate' },
						{ label: 'Escrow the credit must fund', value: formatCurrency(result.paths.buydown.escrowCost) },
						{
							label: 'Payoff credit at 12 months',
							value: formatCurrency(result.paths.buydown.payoffCreditAt.months12),
							emphasis: true
						},
						{ label: 'Payoff credit at 18 months', value: formatCurrency(result.paths.buydown.payoffCreditAt.months18) },
						{ label: 'Payoff credit at 24 months', value: formatCurrency(result.paths.buydown.payoffCreditAt.months24) }
					]}
				/>
				<div className="grid content-start gap-4">
					<Note>
						The rate curve is not linear. The first two points are worth about {form.bpsPerPoint} basis points
						each; after that the lender buys less per point, so the engine discounts deeper buydowns rather
						than pretending {((form.credit / (form.price * (1 - form.downShare))) * 100).toFixed(1)} points
						buys a rate nobody would quote.
					</Note>
					<Note>
						A 2-1 plan is a subsidy on the payment, not on the note. The note rate is unchanged, which is why
						the payment snaps back in year three whether or not the household is ready.
					</Note>
					{result.paths.buydown.excessCredit > 0 ? (
						<Note tone="warn">
							The credit is larger than the plan needs. {formatCurrency(result.paths.buydown.excessCredit)} has
							to go somewhere — a partial permanent buy-down, a slightly larger 3-2, or back into the price.
						</Note>
					) : null}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>Net cost is cash over the hold plus property tax, less any credit that survives a payoff.</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the comparison'}
				</button>
			</div>
		</div>
	);
}
