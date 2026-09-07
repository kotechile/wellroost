import type { LeasePenaltyMethod } from '../../../../lib/calculators/types';

interface SelectFieldProps {
	id: string;
	label: string;
	eyebrow?: string;
	value: LeasePenaltyMethod;
	helpText: string;
	onChange: (value: LeasePenaltyMethod) => void;
}

const OPTIONS: Array<{ value: LeasePenaltyMethod; label: string }> = [
	{ value: 'fixed', label: 'Fixed fee' },
	{ value: 'percentage', label: 'Percentage of remaining lease value' },
	{ value: 'months', label: 'Months of rent' }
];

export function SelectField({ id, label, eyebrow, value, helpText, onChange }: SelectFieldProps) {
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
					Contract type
				</span>
			</div>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value as LeasePenaltyMethod)}
				className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-900 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
			>
				{OPTIONS.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<p className="text-xs leading-5 text-gray-500">{helpText}</p>
		</label>
	);
}
