# Remodelytics Integration Roadmap

This document turns the current Remodelytics v1 calculator into an implementation-ready roadmap.

It is designed for the current Astro + React island architecture in this repository and assumes we will extend the existing tool rather than rebuild it.

## Goals

- Move Remodelytics from a manual scenario model to a property-first decision workflow.
- Add live integrations in the order that most improves user decision quality.
- Separate fetched context, user overrides, and derived calculator inputs.
- Introduce program-specific underwriting rules without bloating the current calculator component.

## Current State

Today the following files power the tool:

- [src/pages/tools/remodelytics.astro](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/pages/tools/remodelytics.astro)
- [src/components/calculators/react/RemodelyticsPlatform.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/RemodelyticsPlatform.tsx)
- [src/lib/calculators/remodelytics.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/remodelytics.ts)
- [src/lib/calculators/types.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/types.ts)

Current behavior:

- User enters assumptions directly.
- No external property, cost, rebate, or valuation data is fetched.
- The underwriting layer uses broad warnings rather than product-specific rule engines.
- Export is lightweight and does not produce a lender-ready artifact.

## Architecture Target

The main design change is to split the current flat manual state into three layers:

1. `fetched context`
   Property facts, valuation, comps, local cost region, AMI, utility context, incentives.
2. `user overrides`
   User-confirmed changes to fetched values and scenario choices.
3. `derived inputs`
   Final normalized object passed into the Remodelytics calculator engine.

Recommended new module area:

- [src/lib/remodelytics/types.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/types.ts)
- [src/lib/remodelytics/merge.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/merge.ts)
- [src/lib/remodelytics/sources.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/sources.ts)
- [src/lib/remodelytics/adapters/](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics)
- [src/lib/remodelytics/program-rules/](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics)

## Shared Types

These are the core interfaces to introduce first.

```ts
export type RemodelyticsSourceKind =
	| 'user'
	| 'property-api'
	| 'valuation-api'
	| 'comps-api'
	| 'cost-api'
	| 'ami-api'
	| 'utilities-api'
	| 'incentives-api'
	| 'rental-api'
	| 'derived';

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
	siteValue?: SourcedValue<number>;
	currentValue?: SourcedValue<number>;
}

export interface ValuationContext {
	avmValue?: SourcedValue<number>;
	compAverageValue?: SourcedValue<number>;
	neighborhoodCeilingValue?: SourcedValue<number>;
	compCount?: SourcedValue<number>;
}

export interface CostContext {
	projectCostBaseline?: SourcedValue<number>;
	cityCostIndex?: SourcedValue<number>;
	baselineCostIndex?: SourcedValue<number>;
	localProjectCostEstimate?: SourcedValue<number>;
}

export interface IncentiveContext {
	localAmi?: SourcedValue<number>;
	hearEligible?: SourcedValue<boolean>;
	homesEligible?: SourcedValue<boolean>;
	estimatedRebateAmount?: SourcedValue<number>;
}

export interface UtilityContext {
	baselineMonthlyUtilityCost?: SourcedValue<number>;
	climateZone?: SourcedValue<string>;
	utilityRateElectric?: SourcedValue<number>;
	utilityRateGas?: SourcedValue<number>;
}

export interface RemodelyticsFetchedContext {
	property?: PropertyContext;
	valuation?: ValuationContext;
	cost?: CostContext;
	incentives?: IncentiveContext;
	utilities?: UtilityContext;
}

export interface RemodelyticsOverrides {
	projectType?: RemodelyticsProjectType;
	materialTier?: RemodelyticsMaterialTier;
	homeValue?: number;
	currentValue?: number;
	compAverageValue?: number;
	projectCostBaseline?: number;
	cityCostIndex?: number;
	localAmi?: number;
	baselineMonthlyUtilityCost?: number;
	purchasePrice?: number;
	mortgageLoanAmount?: number;
	mortgageBalance?: number;
	proposedHelocAmount?: number;
	grossMonthlyRent?: number;
	monthlyOperatingExpenses?: number;
	monthlyDebtService?: number;
	initialCashOutlay?: number;
	currentEfficiency?: number;
	proposedEfficiency?: number;
	energyReductionPercent?: number;
	dtiPercent?: number;
	greenPremiumPercent?: number;
}
```

## Ticket Set

### RM-101: State Model Refactor

Goal:
Split the current single-component manual state into lookup input, fetched context, user overrides, and derived inputs.

Files to add:

- [src/lib/remodelytics/types.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/types.ts)
- [src/lib/remodelytics/merge.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/merge.ts)
- [src/lib/remodelytics/sources.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/sources.ts)

Files to update:

- [src/components/calculators/react/RemodelyticsPlatform.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/RemodelyticsPlatform.tsx)
- [src/lib/calculators/types.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/types.ts)

Implementation notes:

- Keep [src/lib/calculators/remodelytics.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/remodelytics.ts) pure.
- Do not mix fetch logic into the calculation engine.
- `merge.ts` should convert fetched context + overrides into the existing `RemodelyticsInputs` shape.

Acceptance criteria:

- The UI still works with no integrations enabled.
- Manual entry remains possible.
- Final calculator inputs come from a single merge function rather than ad hoc field reads.

### RM-102: Address Lookup Entry Point

Goal:
Change the user journey from manual-first to property-first.

Files to add:

- [src/components/calculators/react/AddressLookupPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/AddressLookupPanel.tsx)
- [src/lib/remodelytics/lookup-state.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/lookup-state.ts)

Files to update:

- [src/components/calculators/react/RemodelyticsPlatform.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/RemodelyticsPlatform.tsx)

Implementation notes:

- Add an address field above the current calculator sections.
- Support these states:
  - idle
  - looking up
  - property found
  - partial data
  - lookup failed
  - manual fallback

Acceptance criteria:

- User can start with an address instead of raw valuation inputs.
- Existing manual field editing still works after lookup.

### RM-201: Property Facts Adapter

Goal:
Fetch normalized property facts and baseline valuation context.

Files to add:

- [src/lib/remodelytics/adapters/property.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/property.ts)

Suggested interface:

```ts
export interface PropertyLookupRequest {
	address: string;
}

export interface PropertyLookupResult {
	property: PropertyContext;
}

export async function fetchPropertyContext(
	request: PropertyLookupRequest
): Promise<PropertyLookupResult> {}
```

Maps to fields:

- `zipCode`
- `homeSize`
- `homeValue`
- `currentValue`

Acceptance criteria:

- Property results are normalized to repository-owned types.
- Failures return typed fallback states rather than throwing UI-breaking errors.

### RM-202: Valuation and Comp Adapter

Goal:
Support `AVM`, comp averages, and neighborhood ceiling logic.

Files to add:

- [src/lib/remodelytics/adapters/valuation.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/valuation.ts)

Suggested interface:

```ts
export interface ValuationLookupRequest {
	address: string;
	projectType: RemodelyticsProjectType;
}

export interface ValuationLookupResult {
	valuation: ValuationContext;
}

export async function fetchValuationContext(
	request: ValuationLookupRequest
): Promise<ValuationLookupResult> {}
```

Maps to fields:

- `homeValue`
- `currentValue`
- `compAverageValue`

Acceptance criteria:

- `ARV` is no longer purely manual by default.
- Result payload includes comp count or confidence metadata.

### RM-301: Construction Cost Adapter

Goal:
Replace manual baseline cost and local cost index entry with live localized pricing.

Files to add:

- [src/lib/remodelytics/adapters/costs.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/costs.ts)

Suggested interface:

```ts
export interface CostLookupRequest {
	zipCode: string;
	projectType: RemodelyticsProjectType;
	materialTier: RemodelyticsMaterialTier;
	homeSize?: number;
}

export interface CostLookupResult {
	cost: CostContext;
}

export async function fetchCostContext(
	request: CostLookupRequest
): Promise<CostLookupResult> {}
```

Maps to fields:

- `projectCostBaseline`
- `cityCostIndex`
- `baselineCostIndex`

UI changes:

- Make `National baseline cost` and `Local CCI` advanced overrides rather than primary fields.

Acceptance criteria:

- Local project cost can be computed from a fetched scope estimate.
- User can still override the fetched cost for scenario testing.

### RM-401: AMI and Incentives Adapter

Goal:
Turn rebate logic into a location-aware estimate.

Files to add:

- [src/lib/remodelytics/adapters/ami.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/ami.ts)
- [src/lib/remodelytics/adapters/incentives.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/incentives.ts)

Suggested interface:

```ts
export interface AmiLookupRequest {
	zipCode: string;
}

export interface IncentiveLookupRequest {
	zipCode: string;
	projectType: RemodelyticsProjectType;
	householdIncome: number;
}

export async function fetchAmiContext(request: AmiLookupRequest): Promise<{
	incentives: IncentiveContext;
}> {}

export async function fetchIncentiveContext(
	request: IncentiveLookupRequest
): Promise<{ incentives: IncentiveContext }> {}
```

Maps to fields:

- `localAmi`
- rebate and credit estimates used by the current calculator engine

Acceptance criteria:

- The calculator can prefill `AMI`.
- Incentive estimates include location-aware source metadata.

### RM-402: Utility and Climate Adapter

Goal:
Improve the energy engine with local rates and usage assumptions.

Files to add:

- [src/lib/remodelytics/adapters/utilities.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/utilities.ts)

Suggested interface:

```ts
export interface UtilityLookupRequest {
	zipCode: string;
	homeSize?: number;
	projectType: RemodelyticsProjectType;
}

export interface UtilityLookupResult {
	utilities: UtilityContext;
}

export async function fetchUtilityContext(
	request: UtilityLookupRequest
): Promise<UtilityLookupResult> {}
```

Maps to fields:

- `baselineMonthlyUtilityCost`
- regional climate assumptions

Acceptance criteria:

- The energy engine no longer depends only on a manually typed utility bill.

### RM-501: Rental Comp Adapter

Goal:
Improve `ADU` and conversion scenarios with local rental assumptions.

Files to add:

- [src/lib/remodelytics/adapters/rentals.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/adapters/rentals.ts)

Suggested interface:

```ts
export interface RentalLookupRequest {
	address: string;
	projectType: RemodelyticsProjectType;
	homeSize?: number;
}

export interface RentalLookupResult {
	grossMonthlyRent?: SourcedValue<number>;
	confidence?: SourceMeta['confidence'];
}

export async function fetchRentalContext(
	request: RentalLookupRequest
): Promise<RentalLookupResult> {}
```

Maps to fields:

- `grossMonthlyRent`

Acceptance criteria:

- `ADU` scenarios can start from a rental comp default rather than a blank rent assumption.

### RM-601: Loan Program Framework

Goal:
Replace generic warning thresholds with program-specific rule evaluation.

Files to add:

- [src/lib/remodelytics/loan-programs.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/loan-programs.ts)
- [src/lib/remodelytics/program-rules/fha203k.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/program-rules/fha203k.ts)
- [src/lib/remodelytics/program-rules/homestyle.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/program-rules/homestyle.ts)
- [src/lib/remodelytics/program-rules/heloc.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/program-rules/heloc.ts)

Suggested interfaces:

```ts
export type LoanProgram = 'fha203k' | 'homestyle' | 'heloc' | 'cash';

export interface LoanProgramRequest {
	program: LoanProgram;
	inputs: RemodelyticsInputs;
	context?: RemodelyticsFetchedContext;
}

export interface LoanProgramFinding {
	severity: 'info' | 'warning' | 'fail';
	code: string;
	message: string;
}

export interface LoanProgramEvaluation {
	isEligible: boolean;
	findings: LoanProgramFinding[];
}

export function evaluateLoanProgram(
	request: LoanProgramRequest
): LoanProgramEvaluation {}
```

Files to update:

- [src/lib/calculators/remodelytics.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/remodelytics.ts)
- [src/components/calculators/react/RemodelyticsPlatform.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/RemodelyticsPlatform.tsx)

Acceptance criteria:

- User can choose a loan program.
- Findings reference the selected product rather than a generic underwriting warning model.

### RM-701: Trust Layer UI

Goal:
Expose source confidence and freshness directly in the interface.

Files to add:

- [src/components/calculators/react/SourceBadge.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/SourceBadge.tsx)
- [src/components/calculators/react/ConfidenceTag.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/LastUpdatedTag.tsx)
- [src/components/calculators/react/ValueWithSource.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/ValueWithSource.tsx)

Files to update:

- [src/components/calculators/react/RemodelyticsPlatform.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/RemodelyticsPlatform.tsx)

Acceptance criteria:

- Important outputs such as `ARV`, cost, utility savings, and incentive amounts display source metadata.
- User can tell which fields are estimated, fetched, or manually overridden.

### RM-801: Exportable Lender Packet

Goal:
Replace the current clipboard export with a formal underwriting packet.

Files to add:

- [src/lib/remodelytics/export.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/remodelytics/export.ts)
- [src/components/calculators/react/ExportPacketButton.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/ExportPacketButton.tsx)

Later optional files:

- a document-generation pipeline or PDF template if we decide to create a true deliverable artifact

Acceptance criteria:

- Export includes scenario assumptions, fetched source metadata, valuation summary, and underwriting findings.

## UI Refactor Plan

To support the above phases without letting the main calculator component sprawl further, split the existing component into smaller surfaces:

- [src/components/calculators/react/AddressLookupPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/AddressLookupPanel.tsx)
- [src/components/calculators/react/PropertyContextPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/PropertyContextPanel.tsx)
- [src/components/calculators/react/ScenarioInputsPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/ScenarioInputsPanel.tsx)
- [src/components/calculators/react/UnderwritingPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/UnderwritingPanel.tsx)
- [src/components/calculators/react/IncentivesPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/IncentivesPanel.tsx)
- [src/components/calculators/react/ResultsPanel.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/ResultsPanel.tsx)

## Dependency Order

Build in this order:

1. `RM-101`
2. `RM-102`
3. `RM-201`
4. `RM-202`
5. `RM-301`
6. `RM-401`
7. `RM-402`
8. `RM-501`
9. `RM-601`
10. `RM-701`
11. `RM-801`

This sequence ensures that the most user-visible decision gains arrive first:

- property and valuation context
- real cost localization
- rebate and energy realism
- loan-program specificity
- trust and export layers

## What Becomes Auto-Filled

These fields should eventually default from fetched data:

- `zipCode`
- `homeValue`
- `currentValue`
- `homeSize`
- `compAverageValue`
- `projectCostBaseline`
- `cityCostIndex`
- `localAmi`
- `baselineMonthlyUtilityCost`
- `grossMonthlyRent`

## What Stays User-Controlled

These fields should remain editable or user-driven:

- `projectType`
- `materialTier`
- `purchasePrice`
- `mortgageLoanAmount`
- `mortgageBalance`
- `proposedHelocAmount`
- `monthlyOperatingExpenses`
- `monthlyDebtService`
- `initialCashOutlay`
- `currentEfficiency`
- `proposedEfficiency`
- `energyReductionPercent`
- `dtiPercent`
- `diyPercentOfArv`

## Suggested Milestone Definition

Milestone A:

- RM-101
- RM-102
- RM-201
- RM-202

Outcome:

- Address-driven property and valuation lookup with editable overrides.

Milestone B:

- RM-301
- RM-401
- RM-402

Outcome:

- Live local cost, `AMI`, incentives, and utility context.

Milestone C:

- RM-501
- RM-601
- RM-701

Outcome:

- Income comps, product-specific underwriting, and confidence/source UI.

Milestone D:

- RM-801

Outcome:

- Shareable underwriting packet and export layer.

## Notes

- The current v1 calculator engine should remain the single place for numerical output logic until program-specific rule engines are introduced.
- Keep adapter modules thin and normalize aggressively. Do not leak raw third-party payload shapes into the UI.
- If a provider changes or becomes unavailable, the repository-owned types should isolate most of the churn.
