import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { MACRO_2026 } from '../../../lib/calculators/data/macro2026';
import { runRentVsBuy, type RentVsBuyInputs } from '../../../lib/calculators/rentVsBuy';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, Columns, MoneyField, Note, NumberField, RateField, Rows, SectionRule } from './ui';

interface FormState extends RentVsBuyInputs {}

const INITIAL: FormState = {
	price: MACRO_2026.medianExistingPrice,
	downShare: 0.1,
	rate: MACRO_2026.mortgageRate,
	termMonths: 360,
	buyClosingShare: 0.03,
	rentMonthly: 2400,
	rentGrowth: 0.03,
	appreciation: 0.0165,
	investReturn: 0.06,
	sellFriction: 0.07,
	maintenanceShare: 0.01,
	insuranceAnnual: 3057,
	taxRate: 0.011,
	magi: 95000,
	filingStatus: 'single',
	stateIncomeTax: 5200,
	horizonYears: 15
};

const compact = (value: number) =>
	value >= 1_000_000
		? `$${(value / 1_000_000).toFixed(2)}m`
		: value <= -1_000_000
			? `−$${(Math.abs(value) / 1_000_000).toFixed(2)}m`
			: `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value) / 1000)}k`;

/** Two wealth paths on one axis. The crossing is the answer, so it gets a marker. */
function ParityChart({ series }: { series: Array<{ year: number; ownerWealth: number; renterWealth: number }> }) {
	const width = 640;
	const height = 200;
	const pad = { top: 12, right: 8, bottom: 22, left: 8 };
	const values = series.flatMap((row) => [row.ownerWealth, row.renterWealth]);
	const min = Math.min(...values, 0);
	const max = Math.max(...values, 1);
	const x = (year: number) => pad.left + ((year - 1) / Math.max(1, series.length - 1)) * (width - pad.left - pad.right);
	const y = (value: number) => pad.top + (1 - (value - min) / Math.max(1, max - min)) * (height - pad.top - pad.bottom);
	const path = (pick: (row: { ownerWealth: number; renterWealth: number }) => number) =>
		series.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(row.year).toFixed(1)} ${y(pick(row)).toFixed(1)}`).join(' ');

	const crossing = series.find((row) => row.ownerWealth >= row.renterWealth);

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className="w-full"
			role="img"
			aria-label={`Owner and renter wealth over ${series.length} years. ${
				crossing ? `Owning overtakes renting in year ${crossing.year}.` : 'Renting stays ahead for the whole horizon.'
			}`}
		>
			<line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="#14130e" strokeOpacity="0.25" strokeWidth="1" />
			<path d={path((row) => row.renterWealth)} fill="none" stroke="#514d3f" strokeWidth="2" strokeDasharray="4 4" />
			<path d={path((row) => row.ownerWealth)} fill="none" stroke="#1c3b2e" strokeWidth="2.4" />
			{crossing ? (
				<circle cx={x(crossing.year)} cy={y(crossing.ownerWealth)} r="3.5" fill="#1c3b2e" />
			) : null}
			<text x={pad.left} y={height - 6} fontSize="9" fill="#514d3f">
				Year 1
			</text>
			<text x={width - pad.right} y={height - 6} fontSize="9" fill="#514d3f" textAnchor="end">
				Year {series.length}
			</text>
		</svg>
	);
}

export default function RentVsBuyCalculator() {
	const persisted = usePersistedInputs<FormState>('rent-vs-buy', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.outflowParity);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const result = useMemo(() => runRentVsBuy(form), [form]);
	const first = result.series[0];

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Rent vs buy, outflow parity',
			sourcePath: '/calculators/rent-vs-buy/',
			verdict:
				result.breakEvenYear !== null
					? `Owning overtakes renting in year ${result.breakEvenYear} on this set of assumptions.`
					: `Renting stays ahead for all ${form.horizonYears} years on this set of assumptions.`,
			sections: [
				{
					heading: 'The two paths',
					rows: [
						['Price', formatCurrency(form.price)],
						['Down payment', `${(form.downShare * 100).toFixed(0)}%`],
						['Rate', `${(form.rate * 100).toFixed(2)}%`],
						['Rent today', `${formatCurrency(form.rentMonthly)} a month`],
						['Appreciation', `${(form.appreciation * 100).toFixed(2)}%`],
						['Investment return', `${(form.investReturn * 100).toFixed(1)}%`],
						['Round-trip sale cost', `${(form.sellFriction * 100).toFixed(1)}%`]
					]
				},
				{
					heading: 'Wealth by year',
					rows: result.terminal.map((row) => [
						`Year ${row.year}`,
						`owner ${formatCurrency(row.owner)} / renter ${formatCurrency(row.renter)}`
					])
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_parity_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Crossing point"
				figure={result.breakEvenYear !== null ? `Year ${result.breakEvenYear}` : `Beyond ${form.horizonYears}`}
				caption={
					result.breakEvenYear !== null
						? 'the year owner equity, net of selling, passes the renter portfolio'
						: 'renting stays ahead for the whole horizon'
				}
				verdict={
					<>
						Both paths start with {formatCurrency(result.upfront.buyer)} of liquid capital. In year one the
						house costs {formatCurrency(first?.ownerOutflow ?? 0)} a month and rent costs{' '}
						{formatCurrency(first?.rent ?? 0)}.
					</>
				}
				tone={result.breakEvenYear !== null ? 'good' : 'warn'}
				stats={[
					{ label: 'Year-one outflow', value: `${formatCurrency(first?.ownerOutflow ?? 0)} vs ${formatCurrency(first?.rent ?? 0)}` },
					{ label: 'Shield, 15 years', value: formatCurrency(result.lifetimeShield) },
					{
						label: 'Ten-year gap',
						value: `${formatCurrency(result.series[9]?.gap ?? 0)} ${(result.series[9]?.gap ?? 0) > 0 ? 'to renting' : 'to owning'}`
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The house</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="rb-price" label="Purchase price" value={form.price} step={5000} onChange={(value) => set('price', value)} />
						<RateField id="rb-down" label="Down payment" value={form.downShare} onChange={(value) => set('downShare', Math.min(1, value))} step={0.5} max={100} />
						<RateField id="rb-rate" label="Mortgage rate" value={form.rate} onChange={(value) => set('rate', value)} />
						<RateField id="rb-appreciation" label="Home price growth" value={form.appreciation} onChange={(value) => set('appreciation', value)} step={0.1} />
						<RateField
							id="rb-sell"
							label="Cost of selling"
							value={form.sellFriction}
							onChange={(value) => set('sellFriction', value)}
							step={0.1}
							hint="Commission, transfer taxes and concessions. It is charged on the way out, not the way in."
						/>
						<MoneyField id="rb-insurance" label="Insurance, a year" value={form.insuranceAnnual} step={100} onChange={(value) => set('insuranceAnnual', value)} />
					</div>
				</div>

				<div>
					<SectionRule>The alternative</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="rb-rent" label="Rent today" value={form.rentMonthly} step={100} onChange={(value) => set('rentMonthly', value)} hint="The rent for the house you would otherwise buy." />
						<RateField id="rb-rentgrowth" label="Rent growth" value={form.rentGrowth} onChange={(value) => set('rentGrowth', value)} step={0.1} />
						<RateField
							id="rb-invest"
							label="Investment return"
							value={form.investReturn}
							onChange={(value) => set('investReturn', value)}
							step={0.5}
							hint="After tax, on the capital both paths start with."
						/>
						<RateField id="rb-tax" label="Effective property tax" value={form.taxRate} onChange={(value) => set('taxRate', value)} step={0.01} />
						<NumberField id="rb-magi" label="Household income" value={form.magi} min={0} step={5000} onChange={(value) => set('magi', value)} hint="Drives the itemisation test and the SALT phase-down." />
						<Choice
							label="Filing status"
							value={form.filingStatus}
							options={[
								{ value: 'single' as const, label: 'Single' },
								{ value: 'joint' as const, label: 'Married, joint' }
							]}
							onChange={(value) => {
								set('filingStatus', value);
								onInputChange('filingStatus');
							}}
						/>
						<NumberField id="rb-horizon" label="Horizon" value={form.horizonYears} min={3} max={30} suffix="years" onChange={(value) => set('horizonYears', value)} />
					</div>
				</div>
			</div>

			<div className="border-t border-ink/15 p-6 sm:p-8">
				<div className="flex flex-wrap items-baseline justify-between gap-3">
					<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Two portfolios, one axis</p>
					<p className="flex flex-wrap items-center gap-4 text-[0.72rem] text-ink-2">
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="inline-block h-[2px] w-5 bg-pine" /> Owning
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="inline-block h-[2px] w-5 border-t-2 border-dashed border-ink-2" /> Renting
						</span>
					</p>
				</div>
				<div className="mt-4">
					<ParityChart series={result.series} />
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Columns
					columns={['Year', 'Owner', 'Renter', 'Gap']}
					rows={result.terminal.map((row) => [
						`Year ${row.year}`,
						compact(row.owner),
						compact(row.renter),
						compact(row.owner - row.renter)
					])}
					caption="Owner wealth is the house net of selling costs and the mortgage balance, plus the portfolio. Renter wealth is the portfolio alone."
				/>
				<div>
					<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Break-even by assumption</p>
					<table className="mt-3 w-full border-collapse text-left">
						<thead>
							<tr className="border-b border-ink/20">
								<th scope="col" className="py-2 pr-3 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-2">Growth</th>
								{[0.04, 0.06, 0.08].map((rate) => (
									<th key={rate} scope="col" className="py-2 pr-3 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-2">
										{(rate * 100).toFixed(0)}% return
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{[0.01, 0.0165, 0.023].map((growth) => (
								<tr key={growth} className="border-b border-ink/10 last:border-b-0">
									<td className="py-2 pr-3 text-[0.8125rem] text-ink-2">{(growth * 100).toFixed(1)}%</td>
									{[0.04, 0.06, 0.08].map((rate) => {
										const cell = result.sensitivity.find(
											(entry) => entry.appreciation === growth && entry.investReturn === rate
										);
										return (
											<td key={rate} className="num py-2 pr-3 text-[0.85rem] text-ink">
												{cell?.breakEvenYear ? `Y${cell.breakEvenYear}` : '—'}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
					<p className="mt-2 text-[0.72rem] leading-snug text-ink-2/85">
						A dash means the crossing is outside the horizon. A single break-even year in a 7% rate market
						would be false precision; nine of them show how much the answer moves.
					</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>
					Maintenance is {formatCurrency(form.price * form.maintenanceShare)} a year, carried on the owner side.
					The tax shield is modelled from the itemisation test, not assumed away.
				</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the ledger'}
				</button>
			</div>
		</div>
	);
}
