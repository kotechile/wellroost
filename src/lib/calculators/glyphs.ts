/**
 * The line marks that identify an engine at a glance.
 *
 * The hub used to be fifteen identical text rows: nothing distinguished "Recast vs Refinance" from
 * "Property Tax Appeal" until you read the sentence under it, so scanning the page was reading the
 * page. A mark does the work a title cannot — it is recognised before it is read.
 *
 * Two rules keep a drawn glyph honest:
 * - One grid (24×24), one stroke (1.5), currentColor only. The colour comes from the family the
 *   engine belongs to, so a mark never introduces a second palette.
 * - It is decoration. Every glyph renders `aria-hidden` and the link keeps its full title, so a
 *   screen reader loses nothing and a failed lookup falls back to the family mark rather than a hole.
 *
 * Keyed by `toolSlug`/family id, both of which already exist in `registry.ts`. Nothing here is a
 * second list of engines — a slug that is missing gets the family mark, not a broken image.
 */
export type GlyphName =
	| 'fork'
	| 'roof-rise'
	| 'grid'
	| 'payment-step'
	| 'steps'
	| 'shield-gap'
	| 'ledger'
	| 'crossing'
	| 'split-three'
	| 'receipt-check'
	| 'coins'
	| 'scales'
	| 'split-bar'
	| 'doc-slash'
	| 'bolt'
	| 'house'
	| 'bill'
	| 'percent'
	| 'cycle';

const paths: Record<GlyphName, string> = {
	// Two ways out of the same house.
	fork: '<path d="M4 8h16M4 8l3.2-3.2M4 8l3.2 3.2"/><path d="M20 16H4M20 16l-3.2-3.2M20 16l-3.2 3.2"/>',
	// A project measured against the value it adds.
	'roof-rise': '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.4V20h12V9.4"/><path d="M12 17v-5.5M9.4 14.1 12 11.5l2.6 2.6"/>',
	// One sheet, every cell loaded.
	grid: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M12 3.5v17M3.5 12h17"/><path d="M12 12h8.5v8.5H12z" fill="currentColor" stroke="none"/>',
	// The payment steps down and stays down.
	'payment-step': '<path d="M3 6h4.5l4 5H21"/><path d="M3 19h18" stroke-dasharray="2.5 3"/>',
	// Rate steps climbing toward a ceiling.
	steps: '<path d="M4 20v-4.5M9 20v-6.5M14 20v-9M19 20v-11.5"/><path d="M3 5h18" stroke-dasharray="2.5 3"/>',
	// Cover with a gap in the middle.
	'shield-gap': '<path d="M12 3.2 19 5.9v6.2c0 4.1-2.9 6.9-7 8.7-4.1-1.8-7-4.6-7-8.7V5.9l7-2.7Z"/><path d="M4.9 12.6h4.2M14.9 12.6h4.2"/>',
	// Five rows, not one number.
	ledger: '<path d="M4.5 5v14"/><path d="M8 7h12M8 12h12M8 17h8"/>',
	// The year the two lines cross.
	crossing: '<path d="M4 5l16 14M20 5 4 19"/><circle cx="12" cy="12" r="2.2"/>',
	// One credit, three destinations.
	'split-three': '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8V12l7 4.1"/>',
	// A claim filed against a repair absorbed.
	'receipt-check': '<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17Z"/><path d="M9 9.5l2 2 4-3.5"/>',
	// The reserve that funds the replacement.
	coins: '<ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7"/><path d="M5.5 12v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5"/>',
	// The assessor's arithmetic, weighed.
	scales: '<path d="M12 4v15M7.5 19.5h9M4 8h16"/><path d="M4 8 2.2 12.6h3.6L4 8ZM20 8l-1.8 4.6h3.6L20 8Z"/>',
	// Cash retained against mortgage insured.
	'split-bar': '<rect x="3" y="9" width="18" height="6"/><path d="M3 9h6v6H3z" fill="currentColor" stroke="none"/><path d="M9 6.5v11"/>',
	// A scope with no permit behind it.
	'doc-slash': '<path d="M6 3.5h7.5L18 8v12.5H6V3.5Z"/><path d="M13.5 3.5V8H18"/><path d="M4 20 20 4"/>',
	// Peak and off-peak on one meter.
	bolt: '<path d="M13.2 3 6.8 13.4h4.2l-1 7.4 6.6-10.6h-4.3l.9-7.2Z"/>',
	// family marks
	house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.4V20h12V9.4"/>',
	bill: '<path d="M5 3.5h14v17H5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
	percent: '<circle cx="8.6" cy="8.6" r="2.3"/><circle cx="15.4" cy="15.4" r="2.3"/><path d="M5.5 18.5 18.5 5.5"/>',
	cycle: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.5V8h-4.5"/>'
};

const byEngine: Record<string, GlyphName> = {
	'move-or-improve': 'fork',
	'remodeling-roi': 'roof-rise',
	remodelytics: 'grid',
	'recast-vs-refinance': 'payment-step',
	'heloc-arm-stress': 'steps',
	'insurance-coverage-gap': 'shield-gap',
	'true-cost-of-ownership': 'ledger',
	'rent-vs-buy': 'crossing',
	'seller-concession': 'split-three',
	'claim-or-self-pay': 'receipt-check',
	'capital-sinking-fund': 'coins',
	'property-tax-appeal': 'scales',
	'down-payment': 'split-bar',
	'unpermitted-work': 'doc-slash',
	'tou-ev-arbitrage': 'bolt'
};

const byFamily: Record<string, GlyphName> = {
	commit: 'house',
	carry: 'bill',
	debt: 'percent',
	recurring: 'cycle',
	elsewhere: 'grid'
};

/** The engine's own mark, or its family's when a new engine has not been drawn yet. */
export function glyphForEngine(toolSlug: string, familyId?: string): GlyphName {
	return byEngine[toolSlug] ?? (familyId ? byFamily[familyId] : undefined) ?? 'grid';
}

export function glyphForFamily(familyId: string): GlyphName {
	return byFamily[familyId] ?? 'grid';
}

export function glyphPaths(name: GlyphName): string {
	return paths[name] ?? paths.grid;
}

/**
 * Family hues. These are the only colour the hub uses beyond ink, paper and pine, and they carry
 * wayfinding alone: rules, marks and chips. Never a body string, never a figure, never a result —
 * pine stays the only colour that means "this is the answer".
 */
export const familyAccent: Record<string, string> = {
	commit: 'var(--color-pine)',
	carry: 'var(--color-clay)',
	debt: 'var(--color-slate)',
	recurring: 'var(--color-ochre)',
	elsewhere: 'var(--color-ink-2)'
};

export function accentForFamily(familyId: string): string {
	return familyAccent[familyId] ?? 'var(--color-ink-2)';
}

/** The band a family chapter is printed on — the light end of the same hue. */
export const familyTint: Record<string, string> = {
	commit: 'var(--color-pine-tint)',
	carry: 'var(--color-clay-tint)',
	debt: 'var(--color-slate-tint)',
	recurring: 'var(--color-ochre-tint)',
	elsewhere: 'var(--color-paper-2)'
};

export function tintForFamily(familyId: string): string {
	return familyTint[familyId] ?? 'var(--color-paper)';
}
