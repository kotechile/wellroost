# Remodelytics Basic Calculator Spec

This document defines the freemium/basic version of Remodelytics.

The goal is to give non-expert homeowners a fast, low-friction answer to a simple question:

`Is this home upgrade worth doing?`

This is intentionally different from the Premium experience. Basic is not a cut-down underwriting tool. It is a plain-language homeowner decision assistant.

## Product Positioning

Basic should feel:

- fast
- friendly
- low-jargon
- confidence-building
- opinionated

Basic should not feel:

- like a lender worksheet
- like an investor model
- like an energy audit dashboard
- like a long professional intake form

## User Goal

The typical user is a homeowner who wants a quick recommendation without gathering a large amount of external data.

Their questions are usually:

- Will I get enough value back to justify this?
- Am I staying long enough for this to matter?
- Is this mostly lifestyle spending or financially smart spending?

## Route Recommendation

Create Basic as a separate tool rather than merging it into the Premium interface.

Recommended route:

- `/tools/remodeling-roi-calculator`

Keep Premium as:

- `/tools/remodelytics`

This separation avoids one bloated calculator trying to serve two very different audiences.

## Core Inputs

Basic inputs should stay intentionally small.

### Required Inputs

1. `Project type`
2. `Project cost`
3. `Estimated resale lift`
4. `Years staying`
5. `Enjoyment value`
6. `Maintenance savings`

### Input Definitions

#### Project type

UI:

- segmented cards or select field

Suggested options:

- Kitchen remodel
- Bathroom remodel
- Windows / insulation
- HVAC / heat pump
- Solar
- Deck / patio
- Curb appeal exterior
- Flooring / paint
- Other

Purpose:

- Used for default copy and optional soft weighting

#### Project cost

UI:

- currency input

Definition:

- total expected out-of-pocket cost

#### Estimated resale lift

UI:

- currency input
- helper copy: “How much extra value do you think this upgrade adds if you sold after completion?”

Definition:

- homeowner’s estimate of additional property value created by the project

#### Years staying

UI:

- stepper or slider with numeric display

Suggested range:

- 0 to 20 years

#### Enjoyment value

UI:

- 5-point segmented scale

Suggested labels:

- Very low
- Low
- Medium
- High
- Very high

Definition:

- how much day-to-day lifestyle benefit the homeowner expects

Internal mapping:

- Very low = 0
- Low = 0.25
- Medium = 0.5
- High = 0.75
- Very high = 1

#### Maintenance savings

UI:

- currency input
- annual amount

Definition:

- annual avoided costs or reduced ongoing expenses

Examples:

- lower repair burden
- lower utility cost
- reduced replacement frequency

## Derived Outputs

Basic should show only a few outputs, and they should be easy to read in plain English.

### Primary Outputs

1. `Worth it / Maybe / Skip`
2. `Payback`
3. `Resale recovery`
4. `Decision notes`

### Optional Secondary Outputs

- Net lifetime value during stay period
- Lifestyle score
- Financial score

These should stay secondary and not crowd the first screen.

## Core Math Model

Basic does not need a lender-grade engine. It needs clear, defensible heuristics.

### 1. Resale recovery

```txt
resaleRecovery = estimatedResaleLift / projectCost
```

Display:

- percentage
- plain-language label

Examples:

- 80% recovery
- 45% recovery
- 110% recovery

### 2. Stay-period savings

```txt
staySavings = maintenanceSavingsAnnual * yearsStaying
```

### 3. Enjoyment credit

This is not literal cash. It is a normalized decision modifier.

Suggested formula:

```txt
enjoymentCredit = projectCost * enjoymentWeight * enjoymentStayMultiplier
```

Where:

```txt
enjoymentWeight = 0, 0.25, 0.5, 0.75, 1
enjoymentStayMultiplier = min(yearsStaying / 10, 1)
```

Then scale it conservatively:

```txt
effectiveEnjoymentValue = enjoymentCredit * 0.35
```

This prevents “I really want it” from overwhelming financial reality.

### 4. Total realized value during stay

```txt
totalRealizedValue = estimatedResaleLift + staySavings + effectiveEnjoymentValue
```

### 5. Net value

```txt
netValue = totalRealizedValue - projectCost
```

### 6. Payback period

Only compute simple payback from annual maintenance savings when annual savings are meaningful.

```txt
paybackYears = projectCost / maintenanceSavingsAnnual
```

If maintenance savings are very low or zero:

- show `No clear cash payback`

### 7. Decision score

Use a weighted score out of 100.

Suggested components:

- `Resale score`: 45%
- `Stay score`: 20%
- `Savings score`: 15%
- `Enjoyment score`: 20%

#### Resale score

```txt
resaleScore = clamp(resaleRecovery * 100, 0, 100)
```

#### Stay score

```txt
stayScore = clamp((yearsStaying / 10) * 100, 0, 100)
```

#### Savings score

```txt
savingsCoverage = staySavings / projectCost
savingsScore = clamp(savingsCoverage * 100, 0, 100)
```

#### Enjoyment score

```txt
enjoymentScore = enjoymentWeight * 100
```

#### Final score

```txt
decisionScore =
  resaleScore * 0.45 +
  stayScore * 0.20 +
  savingsScore * 0.15 +
  enjoymentScore * 0.20
```

## Recommendation Thresholds

Map the score to a simple recommendation.

### Worth it

Use when either:

- `decisionScore >= 70`

or

- `resaleRecovery >= 0.8` and `yearsStaying >= 5`

### Maybe

Use when:

- `decisionScore >= 45` and `< 70`

### Skip

Use when:

- `decisionScore < 45`

or

- `resaleRecovery < 0.35` and `yearsStaying <= 3` and `enjoymentWeight <= 0.5`

## Decision Notes Logic

The calculator should output short explanation text tied to the result.

### Worth it note patterns

- “You’re likely staying long enough to benefit from both daily use and partial resale recovery.”
- “This project appears financially reasonable, especially if your resale estimate is realistic.”
- “Even if it does not fully pay for itself, the combined lifestyle and savings case is strong.”

### Maybe note patterns

- “This looks reasonable, but the decision depends heavily on whether your resale estimate is realistic.”
- “The project may make sense if you value the day-to-day lifestyle benefit more than near-term payback.”
- “This is not a clear financial win, but it could still be a good personal decision if you plan to stay.”

### Skip note patterns

- “This looks hard to justify financially unless the enjoyment value is unusually high.”
- “The short ownership timeline makes it difficult to recover enough value.”
- “You may want to reduce scope, cut cost, or wait until you expect to stay longer.”

## UX Flow

Basic should feel like one screen, not a multi-section dossier.

### Layout Recommendation

Top:

- short intro
- one-sentence promise

Main panel:

- compact form on the left or top
- recommendation card on the right or below

Result area:

- one large decision badge
- three compact output cards:
  - Payback
  - Resale recovery
  - Value during stay
- one decision note block

### Interaction Pattern

- Real-time updates as fields change
- No tabs
- No advanced jargon by default
- Optional “Show how this works” disclosure for formulas

## Copy Recommendations

### Headline

- `Should You Do This Remodel?`

### Subheadline

- `A quick decision tool for homeowners who want a practical answer before spending big.`

### Output Labels

- `Worth it`
- `Maybe`
- `Skip`
- `Resale recovery`
- `Simple payback`
- `Value during your stay`

Avoid using these in the Basic UI unless hidden in a help section:

- ARV
- MAO
- CLTV
- DTI
- AMI

## File Recommendation

Suggested implementation shape:

- [src/pages/tools/remodeling-roi-calculator.astro](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/pages/tools/remodeling-roi-calculator.astro)
- [src/components/calculators/react/BasicRemodelingCalculator.tsx](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/components/calculators/react/BasicRemodelingCalculator.tsx)
- [src/lib/calculators/basicRemodeling.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/basicRemodeling.ts)
- [src/lib/calculators/basicRemodelingTypes.ts](/Users/jorgefernandezilufi/Documents/_giniloh_front_end/src/lib/calculators/basicRemodelingTypes.ts)

## Suggested Types

```ts
export type BasicProjectType =
	| 'kitchen'
	| 'bathroom'
	| 'windows-insulation'
	| 'hvac'
	| 'solar'
	| 'deck-patio'
	| 'curb-appeal'
	| 'flooring-paint'
	| 'other';

export type EnjoymentLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface BasicRemodelingInputs {
	projectType: BasicProjectType;
	projectCost: number;
	estimatedResaleLift: number;
	yearsStaying: number;
	enjoymentLevel: EnjoymentLevel;
	maintenanceSavingsAnnual: number;
}

export type BasicRecommendation = 'worth-it' | 'maybe' | 'skip';

export interface BasicRemodelingBreakdown {
	resaleRecovery: number;
	staySavings: number;
	effectiveEnjoymentValue: number;
	totalRealizedValue: number;
	netValue: number;
	paybackYears: number | null;
	decisionScore: number;
	recommendation: BasicRecommendation;
	decisionNotes: string[];
}
```

## Acceptance Criteria

The Basic calculator is complete when:

- A user can complete it in under 60 seconds.
- The form uses six inputs or fewer.
- The output produces a clear recommendation immediately.
- The recommendation is accompanied by a short explanation.
- The interface avoids lender/investor jargon by default.
- The result can be understood without reading a methodology section.

## Future Optional Enhancements

- Add project-type default ranges for resale lift expectations.
- Add a “compare two projects” mode.
- Add a “show optimistic / base / conservative” toggle.
- Add optional presets like:
  - planning to sell soon
  - forever home
  - utility-focused upgrade

## Recommendation

Build Basic as a separate route and separate calculator engine.

Do not try to hide Premium complexity behind toggles inside the current Remodelytics tool. That would create a crowded experience and weaken both products.
