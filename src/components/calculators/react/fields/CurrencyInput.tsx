import { useEffect, useState, type ChangeEvent } from 'react';

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
	/**
	 * The box holds WHAT THE VISITOR TYPED; the model holds a number.
	 *
	 * Binding `value={value}` (a number) straight to a `type="number"` input loses that distinction:
	 * React skips the DOM write whenever `Number(nodeValue) === value`, so typing or pasting
	 * "052000" leaves the field displaying "052000" while state is 52000. A money field that shows a
	 * number the model does not hold is a defect the visitor can see, so the raw string is kept here
	 * and normalised on blur.
	 */
	const [draft, setDraft] = useState<string>(() => String(value));
	const [editing, setEditing] = useState(false);

	// Steppers, "Start fresh" and a restored snapshot all change `value` from outside. Reflect those,
	// but never while the visitor is typing: rewriting the box mid-keystroke moves their caret and
	// erases the leading zeros they may be about to finish.
	useEffect(() => {
		if (!editing) setDraft(String(value));
	}, [value, editing]);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value;
		setDraft(raw);
		const parsed = Number(raw);
		// An empty or half-typed box still has to mean something: the engines divide by these.
		onChange(raw.trim() === '' || !Number.isFinite(parsed) ? 0 : parsed);
	};

	const handleBlur = () => {
		setEditing(false);
		// Normalise to what the model actually holds, so the display can never disagree with the math.
		setDraft(String(value));
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
					value={draft}
					onChange={handleChange}
					onFocus={() => setEditing(true)}
					onBlur={handleBlur}
					className="w-full rounded-xl border border-gray-300 bg-white px-10 py-3 text-base font-semibold tabular-nums text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
				/>
			</div>
			<p className="text-xs leading-5 text-gray-500">{helpText}</p>
		</label>
	);
}
