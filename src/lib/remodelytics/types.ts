import type {
	RemodelyticsInputs,
	RemodelyticsMaterialTier,
	RemodelyticsProjectType
} from '../calculators/types';

export type RemodelyticsSourceKind =
	| 'user'
	| 'property-api'
	| 'valuation-api'
	| 'derived'
	| 'fallback';

export interface SourceMeta {
	kind: RemodelyticsSourceKind;
	label: string;
	confidence?: 'low' | 'medium' | 'high';
	lastUpdated?: string;
}

export interface SourcedValue<T> {
	value: T;
	source: SourceMeta;
}

export interface PropertyContext {
	address: SourcedValue<string>;
	zipCode: SourcedValue<string>;
	homeSize?: SourcedValue<number>;
	yearBuilt?: SourcedValue<number>;
	bedrooms?: SourcedValue<number>;
	bathrooms?: SourcedValue<number>;
	currentValue?: SourcedValue<number>;
}

export interface ValuationContext {
	avmValue?: SourcedValue<number>;
	compAverageValue?: SourcedValue<number>;
	neighborhoodCeilingValue?: SourcedValue<number>;
	compCount?: SourcedValue<number>;
}

export interface RemodelyticsFetchedContext {
	property?: PropertyContext;
	valuation?: ValuationContext;
}

export interface RemodelyticsOverrides extends Partial<RemodelyticsInputs> {
	projectType?: RemodelyticsProjectType;
	materialTier?: RemodelyticsMaterialTier;
}

export interface PropertyLookupRequest {
	address: string;
}

export interface PropertyLookupResult {
	property: PropertyContext;
}

export interface ValuationLookupRequest {
	address: string;
	projectType: RemodelyticsProjectType;
	currentValue?: number;
}

export interface ValuationLookupResult {
	valuation: ValuationContext;
}

export interface RemodelyticsLookupBundle {
	context: RemodelyticsFetchedContext;
}
