import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { HOUSEHOLD_COMPONENTS, midpointCost } from '../../../lib/calculators/data/components';
import { defaultComponents, runSinkingFund } from '../../../lib/calculators/sinkingFund';
import { formatScenarioPacket, type ScenarioPacket } from '../../../lib/scenarioPacket';
import { saveScenarioPacketAsPdf } from '../../../lib/scenarioPdf';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, Choice, Note, NumberField, Rows, SectionRule, SavePdfButton } from './ui';

interface FormState {
	horizonYears: number;
	shape: number;
	ages: Record<string, number>;
	costs: Record<string, number>;
}

const INITIAL: FormState = {
	horizonYears: 5,
	shape: 3,
	ages: Object.fromEntries(defaultComponents().map((component) => [component.id, component.age])),
	costs: Object.fromEntries(defaultComponents().map((component) => [component.id, component.replacementCost]))
};

export default function SinkingFundCalculator() {
	const persisted = usePersistedInputs<FormState>('capital-sinking-fund', INITIAL, {
		allowedKeys: ['horizonYears', 'shape', 'ages', 'costs'],
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const [pdfState, setPdfState] = useState<'idle' | 'opened' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.sinkingFund);

	const setAge = (id: string, value: number) => {
		persisted.setValue((prev) => ({ ...prev, ages: { ...prev.ages, [id]: value } }));
		onInputChange('ages');
	};

	const setCost = (id: string, value: number) => {
		persisted.setValue((prev) => ({ ...prev, costs: { ...prev.costs, [id]: value } }));
		onInputChange('costs');
	};

	const result = useMemo(
		() =>
			runSinkingFund({
				components: HOUSEHOLD_COMPONENTS.map((component) => ({
					id: component.id,
					age: form.ages[component.id] ?? 0,
					replacementCost: form.costs[component.id] ?? midpointCost(component)
				})),
				horizonYears: form.horizonYears,
				shape: form.shape
			}),
		[form]
	);

	const buildPacket = (): ScenarioPacket => {
		const packet: ScenarioPacket = {
			title: 'Capital sinking fund',
			sourcePath: '/calculators/capital-sinking-fund/',
			verdict: `${formatCurrency(result.monthly)} a month funds ${formatCurrency(result.horizonTotal)} of expected replacements over ${form.horizonYears} years.`,
			sections: [
				{
					heading: 'The window',
					rows: [
						['Horizon', `${form.horizonYears} years`],
						['Monthly contribution', formatCurrency(result.monthly)],
						['Expected replacements', result.expectedFailures.toFixed(1)],
						['Borrowing the same money on a card', formatCurrency(result.debtInterest)]
					]
				},
				{
					heading: 'By system',
					rows: result.rows.map((row) => [
						`${row.label} (${Math.round(row.age)} of ${row.life} yrs)`,
						`${formatCurrency(row.expectedCost)} expected`
					])
				}
			]
		};
		return packet;
	};

	const copyPacket = async () => {
		const copied = await copyText(formatScenarioPacket(buildPacket()));
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_sinking_fund_packet', clipboard: copied });
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
				eyebrow="Monthly contribution"
				figure={formatCurrency(result.monthly)}
				caption={`to fund ${formatCurrency(result.horizonTotal)} of replacements over ${form.horizonYears} years`}
				verdict={
					<>
						{result.expectedFailures.toFixed(1)} expected failures in the window. Borrowing the same money on
						an 18-month card at 24.99% costs {formatCurrency(result.debtInterest)} in interest — that is the
						price of arriving without a fund.
					</>
				}
				tone="neutral"
				stats={[
					{ label: 'Next failure', value: result.next[0] ? `${result.next[0].label}, ${result.next[0].yearsAway.toFixed(1)} yrs` : 'none modelled' },
					{ label: 'Card interest avoided', value: formatCurrency(result.debtInterest) },
					{ label: 'Curve shape', value: `Weibull k = ${form.shape}` }
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
				<div>
					<SectionRule>The window</SectionRule>
					<Choice
						label="Fund the next"
						value={String(form.horizonYears)}
						options={[
							{ value: '1', label: '1 year' },
							{ value: '3', label: '3 years' },
							{ value: '5', label: '5 years' }
						]}
						onChange={(value) => {
							persisted.setValue((prev) => ({ ...prev, horizonYears: Number(value) }));
							onInputChange('horizonYears');
						}}
					/>
					<NumberField
						id="sf-shape"
						label="Wear-out shape (k)"
						value={form.shape}
						min={1}
						max={6}
						step={0.5}
						onChange={(value) => {
							persisted.setValue((prev) => ({ ...prev, shape: value }));
							onInputChange('shape');
						}}
						hint="3 is a clear wear-out curve. 1 would be memoryless, which understates an old roof."
					/>
					<div className="pt-2">
						<Note>
							A one-year window is a catch-up figure — what it costs to be ready by next winter. A
							five-year window is the sustainable contribution. Both are honest; they answer different
							questions.
						</Note>
					</div>
				</div>

				<div>
					<SectionRule>The systems</SectionRule>
					<div className="divide-y divide-ink/10">
						{HOUSEHOLD_COMPONENTS.map((component) => {
							const row = result.rows.find((entry) => entry.id === component.id);
							const used = row ? Math.min(1, row.lifeUsed) : 0;
							return (
								<div key={component.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_5rem_7rem] sm:items-end">
									<div>
										<p className="text-[0.875rem] text-ink">{component.label}</p>
										<div className="mt-1.5 h-1 w-full max-w-[16rem] bg-paper-2">
											<div
												className={used > 0.75 ? 'h-full bg-[#b4643f]' : 'h-full bg-pine'}
												style={{ width: `${used * 100}%` }}
											/>
										</div>
										<p className="mt-1 text-[0.7rem] text-ink-2">
											{Math.round(component.life[0])}–{Math.round(component.life[1])} years expected
										</p>
									</div>
									<label className="grid gap-1">
										<span className="text-[0.62rem] uppercase tracking-[0.14em] text-ink-2">Age</span>
										<input
											type="number"
											min={0}
											max={60}
											value={form.ages[component.id] ?? 0}
											onChange={(event) => setAge(component.id, Number(event.target.value))}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[0.62rem] uppercase tracking-[0.14em] text-ink-2">Replace</span>
										<input
											type="number"
											min={0}
											step={250}
											value={form.costs[component.id] ?? 0}
											onChange={(event) => setCost(component.id, Number(event.target.value))}
											className="w-full border-0 border-b border-ink/25 bg-transparent pb-1 text-[0.95rem] tabular-nums text-ink outline-none focus:border-pine"
										/>
									</label>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="What the fund is for"
					rows={result.rows.map((row) => ({
						label: row.label,
						value: `${formatCurrency(row.expectedCost)} in the window`,
						hint: `${Math.round(row.windowProbability * 100)}% chance of failing inside ${form.horizonYears} years`
					}))}
				/>
				<div className="grid content-start gap-4">
					<Rows
						title="Next three, by median date"
						rows={
							result.next.length > 0
								? result.next.map((row) => ({
										label: row.label,
										value: `${row.yearsAway.toFixed(1)} years, ${formatCurrency(row.cost)}`
									}))
								: [{ label: 'Nothing inside the modelled window', value: '—' }]
						}
						foot="The median is the age at which half of these units have failed. Some fail earlier, which is what the contribution is for."
					/>
					<Note>
						Lives are InterNACHI's service-life ranges; costs are 2026 replacement ranges. Both are inputs —
						replace them with the quote you were given.
					</Note>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>The lever for each system, and the reason it usually fails early, is in the table behind this page.</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the schedule'}
				</button>
				<SavePdfButton onClick={savePdf} state={pdfState} />
			</div>
		</div>
	);
}
