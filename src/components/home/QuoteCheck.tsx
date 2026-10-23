/**
 * Quote Check — the homepage's live instrument.
 *
 * Three inputs and one output: the gap between what a project costs and what it likely lifts the
 * value by. It is deliberately narrower than the Remodeling ROI engine, because the hero has one
 * job — show a visitor, in about five seconds, that the number they were quoted is not the number
 * they pay. Enjoyment credit and the decision score stay on the engine page.
 *
 * The lift default (60% of cost) is a placeholder, and the panel says so out loud rather than
 * presenting it as research. Every figure the panel prints is derived from the visitor's own inputs.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { copyText } from '../../lib/clipboard';
import { formatCurrency } from '../../lib/calculators/format';
import { useVibeTelemetry } from '../../lib/useVibeTelemetry';
import { vibeAssets } from '../../lib/vibeAssets';

const DEFAULT_RECOVERY = 0.6;

interface Preset {
	id: string;
	label: string;
	cost: number;
	savings: number;
}

const PRESETS: Preset[] = [
	{ id: 'kitchen', label: 'Kitchen', cost: 45000, savings: 1200 },
	{ id: 'bathroom', label: 'Bathroom', cost: 24000, savings: 600 },
	{ id: 'windows', label: 'Windows', cost: 18000, savings: 1100 },
	{ id: 'heat-pump', label: 'Heat pump', cost: 14000, savings: 1400 },
	{ id: 'solar', label: 'Solar', cost: 24000, savings: 1800 },
	{ id: 'addition', label: 'Addition', cost: 95000, savings: 400 }
];

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

function useCountUp(target: number, reduced: boolean) {
	const [shown, setShown] = useState(target);
	const from = useRef(target);
	const frame = useRef<number | null>(null);

	useEffect(() => {
		if (reduced) {
			from.current = target;
			setShown(target);
			return;
		}

		const start = performance.now();
		const origin = from.current;
		const delta = target - origin;
		const duration = Math.min(520, 220 + Math.abs(delta) / 90);

		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			const value = origin + delta * eased;
			from.current = value;
			setShown(value);
			if (t < 1) {
				frame.current = requestAnimationFrame(tick);
			} else {
				from.current = target;
				setShown(target);
			}
		};

		frame.current = requestAnimationFrame(tick);
		return () => {
			if (frame.current) cancelAnimationFrame(frame.current);
		};
	}, [target, reduced]);

	return shown;
}

function Figure({ value, className = '' }: { value: number; className?: string }) {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}, []);
	const shown = useCountUp(value, reduced);
	return <span className={`figure tabular-nums ${className}`}>{formatCurrency(Math.round(shown))}</span>;
}

export default function QuoteCheck() {
	const [preset, setPreset] = useState<Preset>(PRESETS[0]);
	const [cost, setCost] = useState(PRESETS[0].cost);
	const [lift, setLift] = useState(roundTo(PRESETS[0].cost * DEFAULT_RECOVERY, 500));
	const [savings, setSavings] = useState(PRESETS[0].savings);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
	const { onInputChange, onComplete } = useVibeTelemetry(vibeAssets.quoteCheck);

	const result = useMemo(() => {
		const recovery = cost > 0 ? lift / cost : 0;
		const gap = cost - lift;
		const payback = savings > 0 ? cost / savings : null;
		return { recovery, gap, payback };
	}, [cost, lift, savings]);

	const choosePreset = (next: Preset) => {
		setPreset(next);
		setCost(next.cost);
		setLift(roundTo(next.cost * DEFAULT_RECOVERY, 500));
		setSavings(next.savings);
		onInputChange('preset');
	};

	const copyFigure = async () => {
		const pct = Math.round(result.recovery * 100);
		const payback = result.payback ? `${result.payback.toFixed(1)} years of ${formatCurrency(savings)} savings` : 'no savings modelled';
		const text =
			result.gap > 0
				? `WellRoost quote check — ${preset.label.toLowerCase()} at ${formatCurrency(cost)}. Resale lift ${formatCurrency(lift)}: ${formatCurrency(result.gap)} you never get back at resale. Recovers ${pct}% of cost; ${payback} closes the rest.`
				: `WellRoost quote check — ${preset.label.toLowerCase()} at ${formatCurrency(cost)}. Resale lift ${formatCurrency(lift)}: ${formatCurrency(Math.abs(result.gap))} of value on top of cost. Recovers ${pct}% of cost.`;
		const copied = await copyText(text);
		setCopyState(copied ? 'copied' : 'blocked');
		onComplete({ action: 'copy_quote_check', clipboard: copied });
		window.setTimeout(() => setCopyState('idle'), 2400);
	};

	const paybackLine =
		result.payback === null
			? 'No savings modelled'
			: result.payback > 40
				? 'Savings never close it'
				: `Savings close it in ${Math.round(result.payback)} years`;

	return (
		<div className="field-dark grid items-stretch gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:gap-14 lg:p-10">
			<div className="flex flex-col justify-between gap-8">
				<div>
					<div className="flex items-baseline justify-between gap-4">
						<h2 className="font-display text-[1.35rem] leading-none tracking-[-0.02em] text-paper">
							What the quote leaves behind
						</h2>
						<p className="text-[0.8125rem] text-paper/70">
							<span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[#b9d6a3]" />
							Live
						</p>
					</div>

					<div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
						<Figure value={result.gap} className="text-[clamp(2.9rem,5.2vw,4.1rem)] text-paper" />
						<p className="mb-2 max-w-[15rem] text-[0.9375rem] leading-snug text-paper/70">
							{result.gap > 0 ? 'you never get back at resale' : 'of value on top of the cost'}
						</p>
					</div>

					<div className="mt-5 flex flex-wrap gap-x-6 gap-y-1.5 text-[0.875rem] text-paper/75">
						<p>
							Recovers <span className="num text-paper">{Math.round(result.recovery * 100)}%</span> of cost
						</p>
						<p>{paybackLine}</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
					<a
						href="/calculators/remodeling-roi/"
						className="inline-flex items-center gap-2 text-[0.9375rem] text-paper transition-opacity hover:opacity-70"
					>
						Open the full ROI engine
						<span aria-hidden="true">&rarr;</span>
					</a>
					<button
						type="button"
						onClick={copyFigure}
						className="text-[0.8125rem] text-paper/75 underline decoration-paper/40 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
					>
						{copyState === 'copied'
							? 'Copied'
							: copyState === 'blocked'
								? 'Copy blocked — select the number'
								: 'Copy the figure'}
					</button>
				</div>
			</div>

			<div className="lg:pt-1">
				<div className="flex flex-wrap gap-1.5" role="group" aria-label="Project type">
					{PRESETS.map((item) => {
						const active = preset.id === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => choosePreset(item)}
								aria-pressed={active}
								className={`h-8 px-3 text-[0.8125rem] transition-colors duration-150 ${
									active ? 'bg-paper text-pine' : 'bg-white/10 text-paper/80 hover:bg-white/20 hover:text-paper'
								}`}
							>
								{item.label}
							</button>
						);
					})}
				</div>

				<div className="mt-6 grid gap-4">
					<Slider
						id="qc-cost"
						label="Project cost"
						value={cost}
						min={5000}
						max={250000}
						step={1000}
						onChange={(value) => {
							setCost(value);
							onInputChange('projectCost');
						}}
						display={formatCurrency(cost)}
					/>
					<Slider
						id="qc-lift"
						label="Resale lift"
						value={lift}
						min={0}
						max={250000}
						step={500}
						onChange={(value) => {
							setLift(value);
							onInputChange('estimatedResaleLift');
						}}
						display={formatCurrency(lift)}
					/>
					<Slider
						id="qc-savings"
						label="Savings a year"
						value={savings}
						min={0}
						max={6000}
						step={100}
						onChange={(value) => {
							setSavings(value);
							onInputChange('maintenanceSavingsAnnual');
						}}
						display={formatCurrency(savings)}
					/>
				</div>

				<p className="mt-5 max-w-[26rem] text-[0.8125rem] leading-relaxed text-paper/60">
					Lift starts at 60% of cost as a placeholder. Replace it with the number your agent or
					appraisal gives you.
				</p>
			</div>
		</div>
	);
}

interface SliderProps {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	display: string;
	onChange: (value: number) => void;
}

function Slider({ id, label, value, min, max, step, display, onChange }: SliderProps) {
	return (
		<div>
			<div className="flex items-baseline justify-between gap-4">
				<label htmlFor={id} className="text-[0.875rem] text-paper/75">
					{label}
				</label>
				<span className="num text-[0.9375rem] text-paper">{display}</span>
			</div>
			<input
				id={id}
				className="range mt-1.5"
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</div>
	);
}
