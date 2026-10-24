import { useMemo, useState } from 'react';
import { copyText } from '../../../lib/clipboard';
import { formatCurrency } from '../../../lib/calculators/format';
import { runClaimDecision, type ClaimInputs, type ClaimPeril } from '../../../lib/calculators/claimOrSelfPay';
import { formatScenarioPacket } from '../../../lib/scenarioPacket';
import { usePersistedInputs } from '../../../lib/usePersistedInputs';
import { useVibeTelemetry } from '../../../lib/useVibeTelemetry';
import { vibeAssets } from '../../../lib/vibeAssets';
import { Band, MoneyField, Note, NumberField, RateField, Rows, SectionRule, SelectField } from './ui';

interface FormState extends ClaimInputs {}

const INITIAL: FormState = {
	damage: 6500,
	deductible: 2500,
	premium: 3057,
	priorClaims: 0,
	peril: 'wind-hail',
	roofAge: 12,
	surcharge: 0.34,
	fairPlanPremium: 6800,
	discountRate: 0.045,
	insuranceInflation: 0.06
};

const PERILS: Array<{ value: ClaimPeril; label: string }> = [
	{ value: 'wind-hail', label: 'Wind or hail' },
	{ value: 'water', label: 'Interior water' },
	{ value: 'liability-fire', label: 'Fire or liability' }
];

/** The decision, drawn: self-pay zone, grey zone, file zone, with the loss marked. */
function DecisionScale({ damage, low, ceiling, high }: { damage: number; low: number; ceiling: number; high: number }) {
	const max = Math.max(damage, high, ceiling) * 1.12 || 1;
	const position = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
	return (
		<div>
			<div className="relative h-9 w-full bg-paper-2">
				<div className="absolute inset-y-0 left-0 bg-[#c9d6bd]" style={{ width: position(low) }} />
				<div className="absolute inset-y-0 bg-[#e6d6a8]" style={{ left: position(low), width: `calc(${position(high)} - ${position(low)})` }} />
				<div className="absolute inset-y-0 right-0 bg-[#e8c3b8]" style={{ left: position(high) }} />
				<div className="absolute inset-y-0 w-[2px] bg-ink" style={{ left: position(damage) }} />
				<div className="absolute -top-1 h-1 w-[2px] bg-ink/40" style={{ left: position(ceiling) }} />
			</div>
			<div className="mt-2 flex justify-between gap-3 text-[0.7rem] text-ink-2">
				<span>Self-pay below {formatCurrency(low)}</span>
				<span>File above {formatCurrency(high)}</span>
			</div>
			<p className="mt-1 text-[0.75rem] text-ink-2/85">
				The black line is the loss you are pricing at {formatCurrency(damage)}. The tick is the central
				ceiling, {formatCurrency(ceiling)}.
			</p>
		</div>
	);
}

export default function ClaimOrSelfPayCalculator() {
	const persisted = usePersistedInputs<FormState>('claim-or-self-pay', INITIAL, {
		allowedKeys: Object.keys(INITIAL),
		version: 1
	});
	const form = persisted.value;
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.claimSelfPay);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		persisted.setValue((prev) => ({ ...prev, [key]: value }));
		onInputChange(String(key));
	};

	const result = useMemo(() => runClaimDecision(form), [form]);

	const verdictCopy =
		result.verdict === 'self-pay' ? (
			<>
				Write the cheque. Filing would net {formatCurrency(result.payout)} now and cost about{' '}
				{formatCurrency(result.expectedPenalty)} in premium over five years — a loss of{' '}
				{formatCurrency(Math.abs(result.netBenefitOfFiling))} for the convenience.
			</>
		) : result.verdict === 'borderline' ? (
			<>
				This is the grey zone. File only if paying {formatCurrency(form.damage)} in cash would push you onto a
				card — the arithmetic is close enough that the financing cost decides it.
			</>
		) : (
			<>
				File. The payout of {formatCurrency(result.payout)} beats the expected five-year penalty of{' '}
				{formatCurrency(result.expectedPenalty)} by {formatCurrency(result.netBenefitOfFiling)}.
			</>
		);

	const copyPacket = async () => {
		const packet = formatScenarioPacket({
			title: 'Claim or self-pay',
			sourcePath: '/calculators/claim-or-self-pay/',
			verdict: `${result.verdict.replace('-', ' ')}: absorb up to ${formatCurrency(result.ceiling)} before filing makes sense.`,
			sections: [
				{
					heading: 'The loss',
					rows: [
						['Repair quote', formatCurrency(form.damage)],
						['Deductible', formatCurrency(form.deductible)],
						['Carrier payout', formatCurrency(result.payout)],
						['Peril', PERILS.find((item) => item.value === form.peril)?.label ?? form.peril]
					]
				},
				{
					heading: 'The five-year penalty',
					rows: [
						['Surcharge if kept', formatCurrency(result.npvSurcharge)],
						['Penalty if non-renewed', formatCurrency(result.npvNonrenewal)],
						['Probability-weighted penalty', formatCurrency(result.expectedPenalty)],
						['Ceiling', formatCurrency(result.ceiling)],
						['Ceiling range', `${formatCurrency(result.ceilingBand.low)} – ${formatCurrency(result.ceilingBand.high)}`]
					]
				}
			]
		});
		const copied = await copyText(packet);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_claim_packet', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	return (
		<div>
			<Band
				eyebrow="Absorb before filing"
				figure={formatCurrency(result.ceiling)}
				caption="the repair figure where self-paying and filing break even"
				verdict={verdictCopy}
				tone={result.verdict === 'self-pay' ? 'good' : result.verdict === 'borderline' ? 'warn' : 'bad'}
				stats={[
					{ label: 'Carrier would pay', value: formatCurrency(result.payout) },
					{ label: 'Expected penalty', value: formatCurrency(result.expectedPenalty) },
					{
						label: 'Ceiling range',
						value: `${formatCurrency(result.ceilingBand.low)} – ${formatCurrency(result.ceilingBand.high)}`
					}
				]}
			/>

			<div className="grid gap-x-12 gap-y-2 p-6 sm:p-8 lg:grid-cols-2">
				<div>
					<SectionRule>The loss</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="cs-damage" label="Repair quote" value={form.damage} step={250} onChange={(value) => set('damage', value)} hint="What a contractor would charge. Not the adjuster's number yet." />
						<MoneyField id="cs-deductible" label="Deductible" value={form.deductible} step={250} onChange={(value) => set('deductible', value)} />
						<SelectField id="cs-peril" label="Peril" value={form.peril} options={PERILS} onChange={(value) => set('peril', value)} hint="Water and liability claims are underwritten harder than wind." />
						<NumberField id="cs-roof" label="Roof age" value={form.roofAge} min={0} max={60} suffix="years" onChange={(value) => set('roofAge', value)} hint="A roof at 15 years raises the non-renewal weight." />
						<NumberField id="cs-prior" label="Claims in the past five years" value={form.priorClaims} min={0} max={6} onChange={(value) => set('priorClaims', value)} />
					</div>
				</div>

				<div>
					<SectionRule>The policy</SectionRule>
					<div className="divide-y divide-ink/10">
						<MoneyField id="cs-premium" label="Premium a year" value={form.premium} step={100} onChange={(value) => set('premium', value)} />
						<RateField id="cs-surcharge" label="Post-claim surcharge" value={form.surcharge} onChange={(value) => set('surcharge', value)} step={1} max={100} hint="The renewal increase plus the claims-free discount you lose." />
						<MoneyField
							id="cs-fair"
							label="Insurer of last resort"
							value={form.fairPlanPremium}
							step={250}
							onChange={(value) => set('fairPlanPremium', value)}
							hint="The state FAIR plan or surplus premium if the policy is non-renewed."
						/>
						<RateField id="cs-discount" label="Opportunity cost of cash" value={form.discountRate} onChange={(value) => set('discountRate', value)} step={0.25} hint="Discount rate for the five-year penalty." />
						<RateField id="cs-inflation" label="Premium inflation" value={form.insuranceInflation} onChange={(value) => set('insuranceInflation', value)} step={0.5} />
					</div>
				</div>
			</div>

			<div className="border-t border-ink/15 p-6 sm:p-8">
				<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">Where this loss sits</p>
				<div className="mt-4">
					<DecisionScale
						damage={form.damage}
						low={result.ceilingBand.low}
						ceiling={result.ceiling}
						high={result.ceilingBand.high}
					/>
				</div>
			</div>

			<div className="grid gap-x-12 gap-y-8 border-t border-ink/15 p-6 sm:p-8 lg:grid-cols-2">
				<Rows
					title="The five-year arithmetic"
					rows={[
						{ label: 'Carrier payout', value: formatCurrency(result.payout) },
						{ label: 'Surcharge, if the policy is kept', value: formatCurrency(result.npvSurcharge) },
						{ label: 'Penalty, if it is non-renewed', value: formatCurrency(result.npvNonrenewal) },
						{ label: 'Non-renewal probability', value: `${Math.round(result.nonrenewalProbability * 100)}%` },
						{ label: 'Probability-weighted penalty', value: formatCurrency(result.expectedPenalty), emphasis: true },
						{ label: 'Net benefit of filing', value: formatCurrency(result.netBenefitOfFiling) }
					]}
				/>
				<div className="grid content-start gap-4">
					<Note>{result.probabilityBasis}</Note>
					<Note>
						The ceiling is returned as a range because that probability is the soft number in the model. If
						your loss sits inside the range, the decision is genuinely close and the cash-flow question —
						can you pay it without borrowing — should decide it.
					</Note>
					<Note tone="warn">
						An inquiry can be recorded even when nothing is paid. If you are not going to file, do not open a
						claim to ask.
					</Note>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-6 py-5 sm:px-8">
				<Note>Carrier underwriting rules differ by state and by insurer. This prices the tradeoff, not the policy.</Note>
				<button
					type="button"
					onClick={copyPacket}
					className="btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
				>
					{copyState === 'copied' ? 'Copied' : copyState === 'blocked' ? 'Copy blocked' : 'Copy the decision'}
				</button>
			</div>
		</div>
	);
}
