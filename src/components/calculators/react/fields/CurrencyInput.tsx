import type { ChangeEvent } from 'react';

interface CurrencyInputProps {
	id: string;
	label: string;
	value: number;
	min?: number;
	step?: number;
	helpText: string;
	onChange: (value: number) => void;
}

function parseNumberInput(event: ChangeEvent<HTMLInputElement>) {
	const nextValue = Number(event.target.value);
	return Number.isFinite(nextValue) ? nextValue : 0;
}

export function CurrencyInput({
	id,
	label,
	value,
	min = 0,
	step = 50,
	helpText,
	onChange
}: CurrencyInputProps) {
	return (
		<label className="grid gap-3" htmlFor={id}>
			<div className="flex items-center justify-between gap-4">
				<span className="text-sm font-semibold tracking-wide text-slate-100">{label}</span>
				<span className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300/70">USD</span>
			</div>
			<div className="relative">
				<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
					$
				</span>
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={min}
					step={step}
					value={value}
					onChange={(event) => onChange(parseNumberInput(event))}
					className="w-full rounded-[1.1rem] border border-slate-700/80 bg-slate-950/70 px-10 py-3.5 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
				/>
			</div>
			<p className="text-sm leading-6 text-slate-400">{helpText}</p>
		</label>
	);
}
