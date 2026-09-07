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
			className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs transition hover:border-gray-300"
			htmlFor={id}
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					{eyebrow ? (
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-gray-500 font-medium">
							{eyebrow}
						</p>
					) : null}
					<span className="mt-1 block text-sm font-semibold tracking-wide text-gray-900">{label}</span>
				</div>
				<span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.2em] font-semibold text-blue-700">
					USD
				</span>
			</div>
			<div className="relative">
				<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium text-gray-400">
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
					className="w-full rounded-xl border border-gray-300 bg-white px-10 py-3 text-base font-semibold tabular-nums text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
				/>
			</div>
			<p className="text-xs leading-5 text-gray-500">{helpText}</p>
		</label>
	);
}
