import type { LeasePenaltyMethod } from '../../../../lib/calculators/types';

interface SelectFieldProps {
	id: string;
	label: string;
	value: LeasePenaltyMethod;
	helpText: string;
	onChange: (value: LeasePenaltyMethod) => void;
}

const OPTIONS: Array<{ value: LeasePenaltyMethod; label: string }> = [
	{ value: 'fixed', label: 'Fixed fee' },
	{ value: 'percentage', label: 'Percentage of remaining lease value' },
	{ value: 'months', label: 'Months of rent' }
];

export function SelectField({ id, label, value, helpText, onChange }: SelectFieldProps) {
	return (
		<label className="grid gap-3" htmlFor={id}>
			<div className="flex items-center justify-between gap-4">
				<span className="text-sm font-semibold tracking-wide text-slate-100">{label}</span>
				<span className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300/70">
					Contract type
				</span>
			</div>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value as LeasePenaltyMethod)}
				className="w-full rounded-[1.1rem] border border-slate-700/80 bg-slate-950/70 px-4 py-3.5 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
			>
				{OPTIONS.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<p className="text-sm leading-6 text-slate-400">{helpText}</p>
		</label>
	);
}
