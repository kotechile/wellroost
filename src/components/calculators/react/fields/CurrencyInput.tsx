import type { ChangeEvent } from 'react';

interface CurrencyInputProps {
	id: string;
	label: string;
	value: number;
	eyebrow?: string;
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
	eyebrow,
	min = 0,
	step = 50,
	helpText,
	onChange
}: CurrencyInputProps) {
	return (
		<label
			className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-slate-700/90"
			htmlFor={id}
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					{eyebrow ? (
						<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] text-slate-500">
							{eyebrow}
						</p>
					) : null}
					<span className="mt-1 block text-sm font-semibold tracking-wide text-slate-100">{label}</span>
				</div>
				<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-cyan-200/80">
					USD
				</span>
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
					className="w-full rounded-[1.1rem] border border-slate-700/80 bg-slate-950/80 px-10 py-3.5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
				/>
			</div>
			<p className="text-sm leading-6 text-slate-400">{helpText}</p>
		</label>
	);
}
