import { formatCurrency } from '../../../lib/calculators/format';
import type { RemodelyticsFetchedContext } from '../../../lib/remodelytics/types';

interface AddressLookupPanelProps {
	address: string;
	status: 'idle' | 'loading' | 'loaded' | 'error';
	message?: string | null;
	context: RemodelyticsFetchedContext | null;
	onAddressChange: (value: string) => void;
	onLookup: () => void;
}

function formatSourceLabel(label?: string) {
	return label ?? 'Source unavailable';
}

export default function AddressLookupPanel({
	address,
	status,
	message,
	context,
	onAddressChange,
	onLookup
}: AddressLookupPanelProps) {
	const property = context?.property;
	const valuation = context?.valuation;

	return (
		<section className="rounded-[1.8rem] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(8,38,74,0.96),rgba(2,6,23,0.98))] p-5 shadow-[0_0_34px_rgba(34,211,238,0.06)]">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="max-w-3xl">
					<p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">
						Property lookup
					</p>
					<h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
						Start with the property, then edit the scenario
					</h3>
					<p className="mt-3 text-sm leading-7 text-slate-200">
						This first integration slice pre-fills ZIP, size, current value, and comp-based renovation
						value from an address lookup flow. It uses a local fallback adapter today, so we can wire the
						workflow before adding a live data provider.
					</p>
				</div>
				<span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-slate-200">
					{status === 'loaded' ? 'context loaded' : status === 'loading' ? 'looking up' : 'manual fallback'}
				</span>
			</div>

			<div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
				<div className="rounded-[1.35rem] border border-slate-800/80 bg-slate-950/55 p-4">
					<label className="grid gap-3">
						<span className="text-sm font-semibold tracking-wide text-slate-100">Property address</span>
						<div className="flex flex-col gap-3 sm:flex-row">
							<input
								value={address}
								onChange={(event) => onAddressChange(event.target.value)}
								placeholder="123 Example St, Miami Beach, FL 33139"
								className="min-w-0 flex-1 rounded-[1rem] border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:text-base"
							/>
							<button
								type="button"
								onClick={onLookup}
								disabled={status === 'loading'}
								className="shrink-0 whitespace-nowrap rounded-[1rem] border border-cyan-400/40 bg-cyan-400/20 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/25 disabled:cursor-wait disabled:opacity-70"
							>
								{status === 'loading' ? 'Loading context...' : 'Load property context'}
							</button>
						</div>
					</label>

					{message ? (
						<p
							className={[
								'mt-3 rounded-[1rem] border p-3 text-sm leading-6',
								status === 'error'
									? 'border-amber-400/30 bg-amber-500/15 text-amber-100'
									: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
							].join(' ')}
						>
							{message}
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
					<div className="rounded-[1.15rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">ZIP</p>
						<p className="mt-3 text-xl font-semibold tabular-nums text-white">
							{property?.zipCode?.value ?? '—'}
						</p>
						<p className="mt-2 text-xs leading-5 text-slate-400">
							{formatSourceLabel(property?.zipCode?.source.label)}
						</p>
					</div>
					<div className="rounded-[1.15rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">Size</p>
						<p className="mt-3 text-xl font-semibold tabular-nums text-white">
							{property?.homeSize?.value ? `${property.homeSize.value.toLocaleString()} sf` : '—'}
						</p>
						<p className="mt-2 text-xs leading-5 text-slate-400">
							{formatSourceLabel(property?.homeSize?.source.label)}
						</p>
					</div>
					<div className="rounded-[1.15rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">AVM</p>
						<p className="mt-3 text-xl font-semibold tabular-nums text-white">
							{valuation?.avmValue?.value ? formatCurrency(valuation.avmValue.value) : '—'}
						</p>
						<p className="mt-2 text-xs leading-5 text-slate-400">
							{formatSourceLabel(valuation?.avmValue?.source.label)}
						</p>
					</div>
					<div className="rounded-[1.15rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">Comp ARV</p>
						<p className="mt-3 text-xl font-semibold tabular-nums text-white">
							{valuation?.compAverageValue?.value ? formatCurrency(valuation.compAverageValue.value) : '—'}
						</p>
						<p className="mt-2 text-xs leading-5 text-slate-400">
							{valuation?.compCount?.value ? `${valuation.compCount.value} comps, local fallback model` : 'Comp context unavailable'}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
