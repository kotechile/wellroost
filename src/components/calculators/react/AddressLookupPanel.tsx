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
		<section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="max-w-3xl">
					<p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-blue-700">
						Property lookup
					</p>
					<h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
						Start with the property, then edit the scenario
					</h3>
					<p className="mt-2 text-sm leading-relaxed text-gray-600">
						This first integration slice pre-fills ZIP, size, current value, and comp-based renovation
						value from an address lookup flow. It uses a local fallback adapter today, so we can wire the
						workflow before adding a live data provider.
					</p>
				</div>
				<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.22em] font-medium text-gray-700">
					{status === 'loaded' ? 'context loaded' : status === 'loading' ? 'looking up' : 'manual fallback'}
				</span>
			</div>

			<div className="mt-5 grid gap-4">
				<div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
					<label className="grid gap-3">
						<span className="text-sm font-semibold tracking-wide text-gray-900">Property address</span>
						<div className="flex flex-col gap-3 sm:flex-row">
							<input
								value={address}
								onChange={(event) => onAddressChange(event.target.value)}
								placeholder="123 Example St, Miami Beach, FL 33139"
								className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-base"
							/>
							<button
								type="button"
								onClick={onLookup}
								disabled={status === 'loading'}
								className="inline-flex shrink-0 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-wait disabled:opacity-70"
							>
								{status === 'loading' ? 'Loading context...' : 'Load property context'}
							</button>
						</div>
					</label>

					{message ? (
						<p
							className={[
								'mt-3 rounded-lg border p-3 text-sm leading-6 font-medium',
								status === 'error'
									? 'border-amber-200 bg-amber-50 text-amber-900'
									: 'border-emerald-200 bg-emerald-50 text-emerald-900'
							].join(' ')}
						>
							{message}
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-semibold text-gray-500">ZIP</p>
						<p className="mt-2 text-xl font-bold tabular-nums text-gray-900">
							{property?.zipCode?.value ?? '—'}
						</p>
						<p className="mt-1 text-xs leading-5 text-gray-500">
							{formatSourceLabel(property?.zipCode?.source.label)}
						</p>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-semibold text-gray-500">Size</p>
						<p className="mt-2 text-xl font-bold tabular-nums text-gray-900">
							{property?.homeSize?.value ? `${property.homeSize.value.toLocaleString()} sf` : '—'}
						</p>
						<p className="mt-1 text-xs leading-5 text-gray-500">
							{formatSourceLabel(property?.homeSize?.source.label)}
						</p>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-semibold text-gray-500">AVM</p>
						<p className="mt-2 text-xl font-bold tabular-nums text-gray-900">
							{valuation?.avmValue?.value ? formatCurrency(valuation.avmValue.value) : '—'}
						</p>
						<p className="mt-1 text-xs leading-5 text-gray-500">
							{formatSourceLabel(valuation?.avmValue?.source.label)}
						</p>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
						<p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] font-semibold text-gray-500">Comp ARV</p>
						<p className="mt-2 text-xl font-bold tabular-nums text-gray-900">
							{valuation?.compAverageValue?.value ? formatCurrency(valuation.compAverageValue.value) : '—'}
						</p>
						<p className="mt-1 text-xs leading-5 text-gray-500">
							{valuation?.compCount?.value ? `${valuation.compCount.value} comps, local fallback model` : 'Comp context unavailable'}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
