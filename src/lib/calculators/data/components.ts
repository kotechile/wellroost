/**
 * Household systems: how long they last, what they cost to replace, and what postpones the day.
 *
 * Two engines read this table — the sinking-fund allocator and the insurance coverage gap — and they
 * read it for different columns. The allocator wants the wear-out window and the replacement cost;
 * the insurance engine wants the same life figure to price a roof settled at actual cash value.
 * Sharing one table is what stops the two pages from disagreeing about how long a roof lasts.
 *
 * Life ranges are InterNACHI's published service-life table; costs are 2026 replacement ranges,
 * inflated from the same body of work and kept as a range rather than a point because a single
 * number would be a lie about regional labour markets. Every engine that consumes a cost lets the
 * visitor replace it with a quote.
 */
export interface ComponentRecord {
	id: string;
	label: string;
	/** Expected service life in years, low and high. */
	life: [number, number];
	/** Replacement cost range, USD, 2026. */
	cost: [number, number];
	/** The one maintenance action that meaningfully postpones failure. */
	lever: string;
	source: string;
}

export const HOUSEHOLD_COMPONENTS: ComponentRecord[] = [
	{
		id: 'ac-condenser',
		label: 'Central air condenser',
		life: [7, 15],
		cost: [6500, 11000],
		lever: 'Wash the coil annually and change filters seasonally to avoid compressor burn.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'gas-furnace',
		label: 'Gas furnace (forced air)',
		life: [15, 25],
		cost: [4500, 8500],
		lever: 'Change filters and have the flame sensor and heat exchanger tested each year.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'heat-pump',
		label: 'Split heat pump',
		life: [10, 15],
		cost: [8000, 14000],
		lever: 'Calibrate the defrost cycle and keep the outdoor unit airflow clear.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'water-heater',
		label: 'Tank water heater',
		life: [6, 12],
		cost: [1800, 3200],
		lever: 'Replace the sacrificial anode every three to five years and flush sediment.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'roof-shingle',
		label: 'Architectural shingle roof',
		life: [20, 25],
		cost: [12000, 22000],
		lever: 'Clear gutters and vent the attic to prevent ice damming and heat rot.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'dishwasher',
		label: 'Kitchen dishwasher',
		life: [8, 10],
		cost: [800, 1600],
		lever: 'Clean the pump filter and inspect the supply line and valve annually.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	},
	{
		id: 'refrigerator',
		label: 'Refrigerator or freezer',
		life: [9, 13],
		cost: [1500, 3500],
		lever: 'Dust the condenser coil and check the door gasket seal.',
		source: 'InterNACHI service-life table; 2026 installed-cost range'
	}
];

export const componentById = (id: string) => HOUSEHOLD_COMPONENTS.find((item) => item.id === id);
export const midpointLife = (component: ComponentRecord) => (component.life[0] + component.life[1]) / 2;
export const midpointCost = (component: ComponentRecord) => (component.cost[0] + component.cost[1]) / 2;

/** Roof materials, for the actual-cash-value depreciation schedule. */
export const ROOF_LIVES: Array<{ id: string; label: string; life: number }> = [
	{ id: 'asphalt-3tab', label: 'Asphalt, three-tab', life: 20 },
	{ id: 'asphalt-arch', label: 'Asphalt, architectural', life: 25 },
	{ id: 'metal', label: 'Standing-seam metal', life: 45 },
	{ id: 'tile', label: 'Clay or concrete tile', life: 45 },
	{ id: 'wood-shake', label: 'Wood shake', life: 25 }
];
