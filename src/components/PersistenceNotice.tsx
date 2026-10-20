import React from 'react';

/**
 * Announced restore.
 *
 * Quietly reloading a visitor's own numbers is worse than not remembering them: on a financial
 * model it reads as the tool being wrong. One line plus an explicit escape hatch keeps the
 * convenience without the surprise.
 */
export const PersistenceNotice: React.FC<{ onReset: () => void; what?: string }> = ({ onReset, what = 'inputs' }) => (
	<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
		<p className="text-xs leading-5 text-amber-900">
			<span className="font-semibold">Restored your last session.</span> These are the {what} you left in this
			browser — not defaults.
		</p>
		<button
			type="button"
			onClick={onReset}
			className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-amber-900 transition hover:border-amber-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40"
		>
			Start fresh
		</button>
	</div>
);

export default PersistenceNotice;
