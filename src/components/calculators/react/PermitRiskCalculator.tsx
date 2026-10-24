import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runPermitRisk, type PermitInputs } from '../../../lib/calculators/permitRisk';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, MoneyField, Note, NumberField, RateField, Rows, SectionRule } from './ui';

interface FormState extends PermitInputs {}

const INITIAL: FormState = {
	sqft: 480,
	permitFee: 1200,
	plansCost: 2500,
	penaltyMultiplier: 2,
	engineerLetter: 900,
	destructiveExposure: 2400,
	codeFailProbability: 0.35,
	remediationCost: 6000,
	valuePerSqft: 210,
	appraisalHaircut: 0.75,
	buyerConcession: 5000,
	assessedIncrease: 18000,
	effectiveRate: 0.011,
	stayYears: 7,
	discountRate: 0.04
};

export default function PermitRiskCalculator() {
	const persisted = usePersistedInputs<FormState>('unpermitted-work', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.permitRisk);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const result = useMemo(() => runPermitRisk(form), [form]);
	const winner = result.paths.find((path) => path.id === result.cheapest) ?? result.paths[0];

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Unpermitted work',
			sourcePath: '/calculators/unpermitted-work/',
			verdict: `Cheapest path: ${winner.label.toLowerCase()} at ${formatCurrency(winner.total)}. The largest single exposure is ${formatCurrency(result.maxExposure)}.`,
			sections: [
				{
					heading: 'The work',
					rows: [
						['Area', `${form.sqft} square feet`],
						['Permit fee', formatCurrency(form.permitFee)],
						['Plans and engineering', formatCurrency(form.plansCost)],
						['Penalty multiple', `${form.penaltyMultiplier}×`],
						['Assessed value added', formatCurrency(form.assessedIncrease)]
					]
				},
				{
					heading: 'The three paths',
					rows: result.paths.map((path) => [path.label, `${formatCurrency(path.total)} over ${form.stayYears} years`])
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_permit_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Largest single exposure"
				figure={formatCurrency(result.maxExposure)}
				caption={`across the three paths, over ${form.stayYears} years`}
				verdict={
					<>
						Cheapest is {winner.label.toLowerCase()} at {formatCurrency(winner.total)}. Selling as-is costs{' '}
						{formatCurrency(result.delta.permitVsAsIs)} more than permitting it now, and regularising later
						costs {formatCurrency(result.delta.permitVsRetro)} more.
					</>
				}
				tone={result.cheapest === 'permit' ? 'good' : result.cheapest === 'as-is' ? 'warn' : 'bad'}
				stats={[
					{ label: 'Permit up front', value: formatCurrency(result.paths[0].total) },
					{ label: 'Regularise later', value: formatCurrency(result.paths[1].total) },
					{ label: 'Sell as-is', value: formatCurrency(result.paths[2].total) }
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The work</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="pr-sqft" label="Unpermitted area" value={form.sqft} min={0} max={4000} step={10} suffix="sq ft" onChange={(value) => set('sqft', value)} />
						<MoneyField id="pr-fee" label="Base permit fee" value={form.permitFee} step={50} onChange={(value) => set('permitFee', value)} hint="What the municipality would have charged before the work started." />
						<MoneyField id="pr-plans" label="Plans and calcs" value={form.plansCost} step={100} onChange={(value) => set('plansCost', value)} hint="Architectural or structural stamp, if the scope needs one." />
						<MoneyField id="pr-assessed" label="Assessed value added" value={form.assessedIncrease} step={1000} onChange={(value) => set('assessedIncrease', value)} hint="What the work adds to the roll once it is permitted." />
						<RateField id="pr-rate" label="Effective tax rate" value={form.effectiveRate} onChange={(value) => set('effectiveRate', value)} step={0.01} />
						<NumberField id="pr-stay" label="Years you stay" value={form.stayYears} min={1} max={30} suffix="years" onChange={(value) => set('stayYears', value)} />
					</div>
				</div>

				<div>
					<SectionRule>If it is caught</SectionRule>
					<div className="divide-y divide-ink/10">
						<NumberField id="pr-penalty" label="Penalty multiple" value={form.penaltyMultiplier} min={1} max={5} step={0.5} suffix="× fee" onChange={(value) => set('penaltyMultiplier', value)} hint="Most jurisdictions charge a multiple of the original fee to legalise work." />
						<MoneyField id="pr-engineer" label="Engineer letter" value={form.engineerLetter} step={100} onChange={(value) => set('engineerLetter', value)} />
						<MoneyField id="pr-exposure" label="Opening the work up" value={form.destructiveExposure} step={100} onChange={(value) => set('destructiveExposure', value)} hint="Drywall, ceilings or footings that have to be exposed for inspection." />
						<RateField id="pr-fail" label="Chance it fails code" value={form.codeFailProbability} onChange={(value) => set('codeFailProbability', Math.min(1, value))} step={5} max={100} />
						<MoneyField id="pr-remediation" label="Cost to bring it up to code" value={form.remediationCost} step={250} onChange={(value) => set('remediationCost', value)} />
					</div>
				</div>
			</div>

			<div className="grid gap-px border-t border-ink/15 bg-ink/10 sm:grid-cols-3">
				{result.paths.map((path) => {
					const isWinner = path.id === result.cheapest;
					return (
						<div key={path.id} className={`grid content-start gap-3 p-6 ${isWinner ? 'bg-pine text-paper' : 'bg-card text-ink'}`}>
							<div className="flex items-baseline justify-between gap-2">
								<p className={`text-[0.72rem] uppercase tracking-[0.16em] ${isWinner ? 'text-paper/70' : 'text-ink-2'}`}>{path.label}</p>
								{isWinner ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-paper/70">Cheapest</span> : null}
							</div>
							<p className={`figure text-[1.85rem] ${isWinner ? 'text-paper' : 'text-ink'}`}>{formatCurrency(path.total)}</p>
							<dl className={`mt-1 grid gap-1.5 border-t pt-3 text-[0.78rem] ${isWinner ? 'border-paper/20' : 'border-ink/15'}`}>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Up front</dt>
									<dd className="num">{formatCurrency(path.upfront)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Contingent</dt>
									<dd className="num">{formatCurrency(path.contingent)}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className={isWinner ? 'text-paper/70' : 'text-ink-2'}>Tax over stay</dt>
									<dd className="num">{formatCurrency(path.taxOverStay)}</dd>
								</div>
							</dl>
							<p className={`text-[0.72rem] leading-snug ${isWinner ? 'text-paper/65' : 'text-ink-2/85'}`}>{path.note}</p>
						</div>
					);
				})}
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="The resale haircut"
					rows={[
						{ label: 'Market value of the area', value: formatCurrency(form.sqft * form.valuePerSqft) },
						{ label: 'Share an appraiser will not count', value: `${(form.appraisalHaircut * 100).toFixed(0)}%` },
						{ label: 'Value lost at resale', value: formatCurrency(form.sqft * form.valuePerSqft * form.appraisalHaircut) },
						{ label: 'Buyer concession on top', value: formatCurrency(form.buyerConcession) },
						{ label: 'As-is exposure', value: formatCurrency(result.paths[2].total), emphasis: true }
					]}
				/>
				<div className="grid content-start gap-4">
					<Note>
						Unpermitted area is typically excluded from gross living area, so it is not that the appraiser
						values it lower — it is that the room is not counted at all.
					</Note>
					<Note>
						The penalty multiple, the fee and the chance of failing inspection are local. All three are
						inputs because a national average for any of them would be a guess wearing a decimal point.
					</Note>
					<Note tone="warn">
						A retroactive permit does not erase the exposure before it is issued: an insurer can decline a
						claim on work that was unpermitted at the time of the loss.
					</Note>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>Costs are present values discounted at {((form.discountRate || 0) * 100).toFixed(1)}% where the horizon applies.</Note>
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
