/**
 * The shared instrument kit for every engine on this site.
 *
 * The design constraint is that these pages are documents, not dashboards. Warm paper, one dark
 * answer band at the top, ruled fields below it, and a breakdown that reads like a statement. Three
 * consequences worth naming:
 *
 * 1. **The answer prints first.** A visitor's question is "what is the number", not "please show me
 *    a form". The band sits above the inputs, so the page answers before it asks.
 * 2. **Fields are ruled, not boxed.** A border under a number reads as a ledger line. A rounded box
 *    with a blue ring reads as a SaaS trial form — which is the look this site exists to avoid.
 * 3. **Every row that computes something is shown.** No engine emits a total it did not also print
 *    as parts. That is the whole proposition: the arithmetic is visible, so it can be checked.
 */
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ band */

export function Band({
	eyebrow,
	figure,
	caption,
	verdict,
	stats,
	tone = 'neutral'
}: {
	eyebrow: string;
	figure: ReactNode;
	caption?: ReactNode;
	verdict?: ReactNode;
	stats?: Array<{ label: string; value: ReactNode }>;
	tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
	const mark =
		tone === 'good'
			? 'bg-[#b9d6a3]'
			: tone === 'warn'
				? 'bg-[#e0c37e]'
				: tone === 'bad'
					? 'bg-[#d99a86]'
					: 'bg-paper/40';

	return (
		<div className="relative overflow-hidden bg-pine px-6 py-7 text-paper sm:px-8 sm:py-8">
			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<p className="font-mono text-[0.66rem] uppercase tracking-[0.26em] text-paper/60">{eyebrow}</p>
				<p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-paper/55">
					<span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${mark}`} />
					Computed
				</p>
			</div>

			<div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
				<span className="figure text-[clamp(2.15rem,5.2vw,3.35rem)] text-paper">{figure}</span>
				{caption ? (
					<span className="max-w-[22rem] pb-1 text-[0.9rem] leading-snug text-paper/70">{caption}</span>
				) : null}
			</div>

			{verdict ? <div className="mt-4 max-w-[46ch] text-[0.95rem] leading-relaxed text-paper/85">{verdict}</div> : null}

			{stats && stats.length > 0 ? (
				<dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-paper/15 pt-5 sm:grid-cols-3">
					{stats.map((stat) => (
						<div key={stat.label}>
							<dt className="text-[0.7rem] uppercase tracking-[0.16em] text-paper/55">{stat.label}</dt>
							<dd className="num mt-1 text-[1.05rem] leading-tight text-paper">{stat.value}</dd>
						</div>
					))}
				</dl>
			) : null}
		</div>
	);
}

/* ----------------------------------------------------------------- field */

export function Field({
	id,
	label,
	hint,
	badge,
	children
}: {
	id: string;
	label: string;
	hint?: string;
	badge?: string;
	children: ReactNode;
}) {
	return (
		<div className="py-4">
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="block text-[0.78rem] font-medium uppercase tracking-[0.13em] text-ink-2">
					{label}
				</label>
				{badge ? (
					<span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink-2/70">{badge}</span>
				) : null}
			</div>
			{children}
			{hint ? <p className="mt-2 text-[0.75rem] leading-snug text-ink-2/85">{hint}</p> : null}
		</div>
	);
}

const INPUT_CLASS =
	'w-full border-0 border-b border-ink/25 bg-transparent pb-1.5 font-display text-[1.3rem] leading-none tracking-[-0.01em] tabular-nums text-ink outline-none transition-colors placeholder:text-ink-2/40 focus:border-pine focus:border-b-2';

export function MoneyField({
	id,
	label,
	value,
	onChange,
	hint,
	badge,
	min = 0,
	step = 50
}: {
	id: string;
	label: string;
	value: number;
	onChange: (value: number) => void;
	hint?: string;
	badge?: string;
	min?: number;
	step?: number;
}) {
	return (
		<Field id={id} label={label} hint={hint} badge={badge}>
			<div className="mt-2 flex items-baseline gap-1">
				<span aria-hidden="true" className="font-display text-[1.05rem] text-ink-2">
					$
				</span>
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={min}
					step={step}
					value={Number.isFinite(value) ? value : 0}
					onChange={(event) => onChange(Number(event.target.value))}
					className={INPUT_CLASS}
				/>
			</div>
		</Field>
	);
}

export function NumberField({
	id,
	label,
	value,
	onChange,
	hint,
	badge,
	min = 0,
	max,
	step = 1,
	suffix
}: {
	id: string;
	label: string;
	value: number;
	onChange: (value: number) => void;
	hint?: string;
	badge?: string;
	min?: number;
	max?: number;
	step?: number;
	suffix?: string;
}) {
	return (
		<Field id={id} label={label} hint={hint} badge={badge}>
			<div className="mt-2 flex items-baseline gap-2">
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={min}
					max={max}
					step={step}
					value={Number.isFinite(value) ? value : 0}
					onChange={(event) => onChange(Number(event.target.value))}
					className={INPUT_CLASS}
				/>
				{suffix ? <span className="text-[0.8rem] text-ink-2">{suffix}</span> : null}
			</div>
		</Field>
	);
}

/**
 * A rate stored as a decimal (0.0732) and edited as a percent (7.32). The conversion lives here so
 * no engine has to remember which side of the decimal point it stores.
 */
export function RateField({
	id,
	label,
	value,
	onChange,
	hint,
	badge,
	step = 0.05,
	max = 30
}: {
	id: string;
	label: string;
	value: number;
	onChange: (value: number) => void;
	hint?: string;
	badge?: string;
	step?: number;
	max?: number;
}) {
	return (
		<Field id={id} label={label} hint={hint} badge={badge}>
			<div className="mt-2 flex items-baseline gap-2">
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={0}
					max={max}
					step={step}
					value={Number.isFinite(value) ? Number((value * 100).toFixed(3)) : 0}
					onChange={(event) => onChange(Number(event.target.value) / 100)}
					className={INPUT_CLASS}
				/>
				<span aria-hidden="true" className="text-[0.8rem] text-ink-2">
					%
				</span>
			</div>
		</Field>
	);
}

export function SelectField<T extends string>({
	id,
	label,
	value,
	options,
	onChange,
	hint,
	badge
}: {
	id: string;
	label: string;
	value: T;
	options: Array<{ value: T; label: string }>;
	onChange: (value: T) => void;
	hint?: string;
	badge?: string;
}) {
	return (
		<Field id={id} label={label} hint={hint} badge={badge}>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value as T)}
				className="mt-2 w-full cursor-pointer appearance-none border-0 border-b border-ink/25 bg-transparent pb-1.5 font-display text-[1.15rem] leading-none text-ink outline-none transition-colors focus:border-pine focus:border-b-2"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Field>
	);
}

/** Segmented control. Two to four short options; anything longer belongs in a select. */
export function Choice<T extends string>({
	label,
	value,
	options,
	onChange
}: {
	label: string;
	value: T;
	options: Array<{ value: T; label: string }>;
	onChange: (value: T) => void;
}) {
	return (
		<div className="py-4" role="group" aria-label={label}>
			<p className="text-[0.78rem] font-medium uppercase tracking-[0.13em] text-ink-2">{label}</p>
			<div className="mt-2.5 flex flex-wrap gap-1.5">
				{options.map((option) => {
					const active = option.value === value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							aria-pressed={active}
							className={`h-9 px-3.5 text-[0.8125rem] transition-colors duration-150 ${
								active ? 'bg-pine text-paper' : 'bg-paper-2 text-ink-2 hover:bg-paper-3 hover:text-ink'
							}`}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/* ----------------------------------------------------------------- rows */

export function Rows({
	title,
	rows,
	foot
}: {
	title?: string;
	rows: Array<{ label: string; value: ReactNode; emphasis?: boolean; hint?: string }>;
	foot?: ReactNode;
}) {
	return (
		<div>
			{title ? (
				<p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">{title}</p>
			) : null}
			<dl className={title ? 'mt-3' : ''}>
				{rows.map((row) => (
					<div
						key={row.label}
						className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-2.5 last:border-b-0"
					>
						<div>
							<dt
								className={
									row.emphasis
										? 'text-[0.9375rem] font-medium text-ink'
										: 'text-[0.9375rem] text-ink-2'
								}
							>
								{row.label}
							</dt>
							{row.hint ? <p className="mt-0.5 text-[0.72rem] leading-snug text-ink-2/80">{row.hint}</p> : null}
						</div>
						<dd
							className={`num shrink-0 tabular-nums ${
								row.emphasis ? 'text-[1.05rem] font-semibold text-ink' : 'text-[0.975rem] text-ink'
							}`}
						>
							{row.value}
						</dd>
					</div>
				))}
			</dl>
			{foot ? <div className="mt-3 text-[0.78rem] leading-relaxed text-ink-2">{foot}</div> : null}
		</div>
	);
}

export function Columns({
	columns,
	rows,
	caption
}: {
	columns: string[];
	rows: Array<Array<ReactNode>>;
	caption?: string;
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left">
				<thead>
					<tr className="border-b border-ink/20">
						{columns.map((column) => (
							<th
								key={column}
								scope="col"
								className="py-2 pr-4 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink-2 last:pr-0"
							>
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => (
						<tr key={index} className="border-b border-ink/10 last:border-b-0">
							{row.map((cell, cellIndex) => (
								<td
									key={cellIndex}
									className={`py-2.5 pr-4 align-baseline last:pr-0 ${
										cellIndex === 0 ? 'text-[0.875rem] text-ink-2' : 'num tabular-nums text-[0.9rem] text-ink'
									}`}
								>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{caption ? <p className="mt-2 text-[0.72rem] leading-snug text-ink-2/85">{caption}</p> : null}
		</div>
	);
}

/** A composition bar: five rows of outflow read faster as a bar than as five numbers. */
export function Meter({
	segments
}: {
	segments: Array<{ label: string; value: number; tone: 'pine' | 'ink' | 'mid' | 'soft' | 'pale' }>;
}) {
	const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0) || 1;
	const fill = {
		pine: 'bg-pine',
		ink: 'bg-ink',
		mid: 'bg-[#6d7d5c]',
		soft: 'bg-[#a8b199]',
		pale: 'bg-[#cfd3c4]'
	};

	return (
		<div>
			<div className="flex h-3 w-full overflow-hidden bg-paper-2" role="presentation">
				{segments.map((segment) => (
					<span
						key={segment.label}
						className={fill[segment.tone]}
						style={{ width: `${(Math.max(0, segment.value) / total) * 100}%` }}
					/>
				))}
			</div>
			<ul className="mt-3 grid gap-1.5">
				{segments.map((segment) => (
					<li key={segment.label} className="flex items-baseline justify-between gap-3 text-[0.78rem]">
						<span className="flex items-center gap-2 text-ink-2">
							<span aria-hidden="true" className={`inline-block h-2 w-2 ${fill[segment.tone]}`} />
							{segment.label}
						</span>
						<span className="num tabular-nums text-ink">{Math.round((segment.value / total) * 100)}%</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** The assumption line. Every engine prints the numbers it was not given. */
export function Note({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' }) {
	return (
		<p
			className={`text-[0.75rem] leading-relaxed ${
				tone === 'warn' ? 'text-[#7a4a26]' : 'text-ink-2/85'
			}`}
		>
			{children}
		</p>
	);
}

export function SectionRule({ children }: { children: ReactNode }) {
	return (
		<p className="border-t border-ink/15 pt-4 font-mono text-[0.66rem] uppercase tracking-[0.24em] text-ink-2">
			{children}
		</p>
	);
}

/* ---------------------------------------------------------------- export */

/**
 * The PDF half of the export surface, shared so all engines spell it the same way.
 *
 * The label is the contract: `window.print()` tells us the dialog OPENED, never that a file was
 * written. So the confirmation state says exactly that and lets the visitor finish in the dialog's
 * own "Save as PDF" destination. Rendering "Saved" here would be the same class of lie as a
 * hardcoded telemetry badge.
 */
export function SavePdfButton({
	onClick,
	state = 'idle',
	disabled = false,
	className = 'btn-ghost text-[0.875rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink disabled:opacity-40'
}: {
	onClick: () => void;
	state?: 'idle' | 'opened' | 'blocked';
	/** Mirrors the copy button: an engine that refuses to model a state must not print one. */
	disabled?: boolean;
	/** Engines that predate the shared kit keep their own button treatment. */
	className?: string;
}) {
	const label =
		state === 'opened'
			? 'Print dialog open — choose Save as PDF'
			: state === 'blocked'
				? 'Print dialog unavailable — copy the scenario instead'
				: 'Save as PDF';

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title="Opens your browser's print dialog with this scenario as a document"
			className={className}
		>
			{label}
		</button>
	);
}
