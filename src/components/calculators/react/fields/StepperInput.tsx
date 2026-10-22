import { useEffect, useState, type ChangeEvent } from 'react';

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

	/**
	 * Same reason as `CurrencyInput`: the box keeps the raw string the visitor typed, and only blur
	 * normalises it. Without this, clearing the field or typing a first digit below `min` snapped the
	 * value to the minimum mid-keystroke, so a twelve-month floor could not be typed into at all.
	 */
	const [draft, setDraft] = useState<string>(() => String(value));
	const [editing, setEditing] = useState(false);

	useEffect(() => {
		if (!editing) setDraft(String(value));
	}, [value, editing]);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value;
		setDraft(raw);
		const parsed = Number(raw);
		// Half-typed or empty: hold the model at the floor rather than at NaN.
		onChange(raw.trim() === '' || !Number.isFinite(parsed) ? min : clampValue(parsed, min, max));
	};

	const handleBlur = () => {
		setEditing(false);
		const parsed = Number(draft);
		const normalised = draft.trim() === '' || !Number.isFinite(parsed) ? min : clampValue(parsed, min, max);
		if (normalised !== value) onChange(normalised);
		setDraft(String(normalised));
	};

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
				{suffix ? (
					<span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.2em] font-semibold text-blue-700">
						{suffix}
					</span>
				) : null}
			</div>
			<div className="flex items-center rounded-xl border border-gray-300 bg-white shadow-xs">
				<button
					type="button"
					onClick={() => updateValue(value - step)}
					className="inline-flex h-12 w-12 items-center justify-center rounded-l-xl border-r border-gray-200 text-lg font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
					value={draft}
					onChange={handleChange}
					onFocus={() => setEditing(true)}
					onBlur={handleBlur}
					className="h-12 w-full bg-transparent px-4 text-center text-base font-semibold tabular-nums text-gray-900 outline-none"
				/>
				<button
					type="button"
					onClick={() => updateValue(value + step)}
					className="inline-flex h-12 w-12 items-center justify-center rounded-r-xl border-l border-gray-200 text-lg font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
					aria-label={`Increase ${label}`}
				>
					+
				</button>
			</div>
			<p className="text-xs leading-5 text-gray-500">{helpText}</p>
		</label>
	);
}
