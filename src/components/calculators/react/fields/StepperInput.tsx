interface StepperInputProps {
	id: string;
	label: string;
	value: number;
	eyebrow?: string;
	min?: number;
	max?: number;
	step?: number;
	helpText: string;
	suffix?: string;
	onChange: (value: number) => void;
}

function clampValue(value: number, min: number, max?: number) {
	if (!Number.isFinite(value)) {
		return min;
	}

	if (typeof max === 'number') {
		return Math.min(Math.max(value, min), max);
	}

	return Math.max(value, min);
}

export function StepperInput({
	id,
	label,
	value,
	eyebrow,
	min = 0,
	max,
	step = 1,
	helpText,
	suffix,
	onChange
}: StepperInputProps) {
	const updateValue = (nextValue: number) => onChange(clampValue(nextValue, min, max));

	return (
		<label
			className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-slate-700/90"
			htmlFor={id}
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					{eyebrow ? (
						<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] text-slate-400">
							{eyebrow}
						</p>
					) : null}
					<span className="mt-1 block text-sm font-semibold tracking-wide text-slate-100">{label}</span>
				</div>
				{suffix ? (
					<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-cyan-200/80">
						{suffix}
					</span>
				) : null}
			</div>
			<div className="flex items-center rounded-[1.1rem] border border-slate-700/80 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
				<button
					type="button"
					onClick={() => updateValue(value - step)}
					className="inline-flex h-14 w-14 items-center justify-center rounded-l-[1.1rem] border-r border-slate-700/80 text-xl text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
					aria-label={`Decrease ${label}`}
				>
					−
				</button>
				<input
					id={id}
					type="number"
					inputMode="numeric"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(event) => updateValue(Number(event.target.value))}
					className="h-14 w-full bg-transparent px-4 text-center text-base font-semibold text-white outline-none"
				/>
				<button
					type="button"
					onClick={() => updateValue(value + step)}
					className="inline-flex h-14 w-14 items-center justify-center rounded-r-[1.1rem] border-l border-slate-700/80 text-xl text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
					aria-label={`Increase ${label}`}
				>
					+
				</button>
			</div>
			<p className="text-sm leading-6 text-slate-300">{helpText}</p>
		</label>
	);
}
