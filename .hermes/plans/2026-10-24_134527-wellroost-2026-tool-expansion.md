# WellRoost 2026 Tool Expansion — Implementation Plan (rev 2)

> **For Hermes:** planning only. Do not implement in this turn. When execution starts, one subagent per
> task with spec review, per the `plan` skill's handoff.

**Goal:** Ship twelve decision engines that address 2026 carrying-cost and capital-structure pressure, on
one shared calculation core, one registry, one jurisdiction dataset, one dated assumption module, and one
tax module — so engine #12 costs a fraction of engine #1.

**Architecture:** Each engine is a pure TypeScript function in `src/lib/calculators/`, a React island in
`src/components/calculators/react/`, and an Astro page built on `CalculatorShell` + `getCalculatorSchema`.
Identity lives in `src/lib/vibeAssets.ts`; listing in one consolidated registry. No server, no database
read, no visitor values in telemetry — the same contract the three live engines already honour.

**Tech stack:** Astro 6.2.1, React 19.2, Tailwind 4.2, TypeScript 5.9, Vitest (new devDependency,
justified in Task 0.5), Supabase INSERT-only telemetry (no schema change).

## What rev 2 changes

1. **The second review was adjudicated against primary sources.** Three of its four corrections hold, one
   is half-right and needed a third computation. Rev 1 got the recast example wrong in the opposite
   direction and inherited a tax claim that is false for 2026 (§1.3, §1.4).
2. **Six candidate engines from that review enter the portfolio**: three to build, one build-with-
   condition, one deferred to Q1, one demoted to an article (§2.2).
3. **Its drop-in TypeScript must not be pasted in.** Two material bugs are demonstrated under test
   conditions in §2.3 — one misallocates 12% of household kWh, one publishes a break-even that is not the
   inverse of its own model.

---

## 1. Verified baseline — 2026-10-24

Every figure below was checked against a primary or named-industry source today. Nothing in this plan is
copied from either review without a computation behind it.

### 1.1 Market data: confirmed

| Claim | Verified value | Source |
| --- | --- | --- |
| Fed funds target | **3.75%–4.00%**, raised 25 bps 2026-09-16, 12–0, first hike since 2023 | FOMC statement; CNBC / JPM |
| Fed's own path | SEP median 4.1% at year-end 2026; 2026 PCE 3.7% | September 2026 SEP |
| 30-yr fixed | **7.32%** (week of 2026-10-22), down from 7.40%; **6.19%** a year ago | Freddie Mac PMMS |
| Median existing-home price | **$417,500**, +1.3% YoY, 39th consecutive month | NAR, released 2026-10-13 |
| Inventory | 1.60M units, **4.8 months' supply**; sales 3.99M SAAR, −2.2% YoY | NAR |
| Tax baseline | $16,100 single / $32,200 joint standard deduction; interest deductible on the first $750,000 | IRS / OBBBA |
| SALT cap | **$40,400** for 2026; phases down 30% of MAGI above **$505,000**, floor $10,000; reverts to $10,000 in 2030 | OBBBA §70120; CRS RL32781 |
| Conforming limit | **$832,750** baseline 1-unit; $1,249,125 high-cost ceiling | FHFA, announced 2025-11-25 |

The brief's 6.80%–7.47% band is consistent with PMMS but should be superseded by the single 7.32% figure
with its date attached: **`MACRO_2026.mortgageRate = 0.0732`, `asOf: '2026-10-22'`.**

### 1.2 The federal residential energy credits are gone

| Credit | Status for work completed in 2026 | Source |
| --- | --- | --- |
| §25C Energy Efficient Home Improvement | Not allowed for property placed in service after **2025-12-31** | IRS, OBBB (P.L. 119-21) |
| §25D Residential Clean Energy (solar, battery, geothermal) | Not allowed for expenditures after **2025-12-31** | IRS, OBBB |
| HOMES / HEEHR | Still law; open in ~8 states, fully reserved in CA and CO, not participating in SD; DOE Program Notice 26-2 (2026-05-29) bars fuel-switching rebates | DOE; state energy offices |

**Decision:** no standalone energy-credit engine. Fold a zero-federal-credit operating-cost view into the
existing Remodelytics energy engine and drive `section25cCredit` to zero with a dated explanation.

**Better use of the same fact:** the second review's pivot is right, and it is a copy asset rather than an
engine. A contractor still quoting "30% back in federal tax credits" in 2026 is quoting a repealed
credit. That belongs in the Energy pillar as an article with the statute cited, plus one line on the
Remodelytics energy panel — not as a calculator.

### 1.3 The recast example: three readings, one answer

Rev 1 called the brief's numbers wrong outright. That over-reached: the brief's $1,740 is a real number —
it is the **360-month** payment on $400,000. The second review then called the arithmetic "exact", which is
also wrong: $1,392 does not follow from any of it. Computed:

| Path | Starting balance | Term | P&I |
| --- | --- | --- | --- |
| Original note payment | $400,000 | 360 mo | **$1,740.83** ← brief's $1,740 ✓ |
| Balance after 36 scheduled payments | **$375,173.23** | — | (brief and review both say $370,000 ✗) |
| Recast on balance − $50,000 | $325,173.23 | 324 mo | **$1,508.82** ← brief's $1,392 ✗ |
| Monthly relief | — | — | **$232.00** (brief: $348 ✗) |
| Annual relief | — | — | **$2,784.03** |
| Payback on a $250 servicer fee | — | — | **1.08 months** (brief: 0.72 ✗) |

The invariant that makes this verifiable forever: **relief = curtailment × paymentFactor(noteRate,
remainingMonths)**, independent of the balance. $50,000 × 0.004640 = $232.00. That single line becomes the
engine's headline and its property test, and it kills the confusion at the root — every published figure
derives from the curtailment, not from a balance someone typed wrong.

**This changes the product.** Since relief depends only on the curtailment and the remaining term, the
primary affordance is the inverse: *"I need $400 a month back — how much do I have to curtail?"* A tool
that answers that is not the brief's tool.

### 1.4 The tax shield: the brief is wrong, the review is right, and there is a phase-down

The brief claims housing deductions produce "zero marginal cash savings" for a median buyer. That was
true-ish under the $10,000 SALT cap and is **false at $40,400**. Worked at the national median, 10% down,
7.32% (year-1 interest $27,386; property tax $4,592 at a 1.1% effective rate):

| Filer | MAGI | SALT used | Itemized | Standard | Excess | Shield @24% |
| --- | --- | --- | --- | --- | --- | --- |
| Single | $95,000 | $9,792 | $37,179 | $16,100 | $21,079 | **$5,059** |
| Single | $160,000 | $13,592 | $40,979 | $16,100 | $24,879 | **$5,971** |
| Joint | $240,000 | $18,592 | $45,979 | $32,200 | $13,779 | **$3,307** |
| Joint | $560,000 | $23,900 (phased down) | $51,286 | $32,200 | $19,086 | **$4,581** |

A $3,300–$6,000 marginal shield is not zero, and getting it wrong runs rent-vs-buy and true-cost in the
same direction — always against the buy path.

**Requirement:** a shared `taxShield.ts` computing the itemization test properly —
`cap = max(10_000, 40_400 − 0.30 × max(0, MAGI − 505_000))`, itemized = deductible interest (first $750k)
+ min(property tax + state income tax, cap) + charitable, shield = `max(0, itemized − standard) ×
marginalRate`. Inputs are a MAGI band and state income tax; the phase-down is its own output row so a high
earner can watch the cap shrink. It is a **module, not a toggle** — rev 1 had it defaulting off with an
assertion attached, which is the same mistake the brief made.

---

## 2. Portfolio: twelve candidates, seven to build in the next two months

Judged on four axes: does a wrong answer harm the visitor, how much external data does it need, does it
duplicate something already shipped, and how fast can it be *right*.

| # | Engine | New data | Complexity | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Mortgage Recast vs Refinance | none | Low | **Wave 1** |
| 2 | HELOC / ARM Payment Stress Test | none | Low | **Wave 1** |
| 3 | Insurance Deductible & Coverage Gap | component cost table | Low–Med | **Wave 1** |
| 4 | True Cost of Ownership / Escrow Step-Up | jurisdiction table + tax module | Med | **Wave 2** |
| 5 | Outflow-Parity Rent vs Buy | tax module | Med | **Wave 2** |
| 6 | Seller Concession: Buydown vs Points vs Price Cut | none | Low–Med | **Wave 2** ← new |
| 7 | Claim or Self-Pay (CLUE threshold) | none | Low–Med | **Wave 2** ← new |
| 8 | Component Lifecycle & Sinking Fund | component life table | Med | **Wave 2** |
| 9 | Property Tax Appeal Feasibility | jurisdiction + user comps | Med–High | **Wave 3** |
| 10 | Down Payment & PMI Arbitrage (+ DPA) | state HFA table | Med | **Wave 3** |
| 11 | Unpermitted Work / Retroactive Permit Risk | municipal fee heuristics | Med | **Wave 3** ← new |
| 12 | Whole-House TOU & EV Load Arbitrage | utility tariff entry | Med | **Wave 3** ← new, conditional |
| — | Energy Payback (post-IRA) | climate + rebate tables | High | **Do not build** (§1.2) |
| — | Energy-Monitor / Phantom-Load Payback | vendor detection rates | Low | **Article, not engine** |
| — | Autonomous Yard & OPE TCO | equipment pricing | Med | **Defer to Q1** (seasonal) |

### 2.1 Why this order

The brief sequences by economic pain; this plan sequences by **data risk**. Wave 1 is pure arithmetic on
numbers the visitor types, so it can be correct on day one. The tax appeal engine is second-highest on
pain and highest on liability — it ships a document a homeowner files with a board of equalization — so it
ships after the jurisdiction dataset has already been exercised by the cheaper TCO engine.

### 2.2 The six additions, adjudicated

**Build — Seller concession: buydown vs points vs price cut (#6).** The strongest of the six. At 7.32% with
4.8 months' supply, concessions are the live negotiating surface and nobody models the three-way
comparison honestly. Verified at $417,500 / 10% down / $20,000 credit: a straight price cut gives a
$357,750 loan at $2,457.49 P&I; the same $20,000 as points is 5.32 points → 5.99% → $2,250.23 P&I; a 2-1
buydown costs **$8,884** in escrow ($489.92/mo year 1, $250.45/mo year 2).

Two corrections to the review's model:
- **$20,000 exceeds what a 2-1 plan needs at this loan size**, leaving $11,116. The engine must route the
  excess (partial permanent points, or price) rather than silently absorb it.
- Fannie Mae B2-1.4-04 says unused buydown funds at payoff are *credited to the payoff amount, or returned
  to borrower or lender as the agreement specifies*. **The refund is agreement-dependent, not automatic.**
  Model it as an explicit toggle quoting the agreement language — which is also the advice a buyer needs:
  get that sentence in writing before closing.
- 25 bps per point is linear and real pricing is convex. Cap the points-to-rate curve and expose it as an
  editable assumption; 5.32 points does not buy 1.33% in any 2026 rate sheet.

**Build — Claim or Self-Pay / CLUE threshold (#7).** High pain, arithmetic only, and it pairs with the
insurance-gap tool in the same session (exposure, then whether to file). Verified at the review's defaults
($6,500 damage, $2,500 deductible, $3,057 premium, no prior claims, 12-yr roof, 34% surcharge, $6,800 FAIR
plan, 4.5% discount): nonrenewal probability 6%, five-year expected penalty **$5,788**, self-pay ceiling
**$8,288**, net benefit of filing **−$1,788** → self-pay. At one prior claim and an 18-year roof the same
household's nonrenewal probability is 56% and the ceiling moves sharply.

The honesty problem to fix in the build: `p_drop`'s constants (6% / 18% / 25%, +35% per prior claim, +15%
for roof age) are editorial, and printing `nonrenewalProbPct: 6` lends an invented probability two
significant figures of authority. **Publish them as named assumptions with a ±50% sensitivity band** that
shows the ceiling's range — never as a single percentage.

**Build — Unpermitted work / retroactive permit (#11).** Cheap, no dataset (municipal fees are inputs with
defaults), and it attaches to Remodeling ROI at the exact moment a homeowner considers skipping a permit.
Its appraisal-haircut factor must be user-editable (50%–100% GLA exclusion), because that is a lender and
appraiser judgement, not a statutory constant.

**Build with a condition — TOU & EV load arbitrage (#12).** Good product, wrong data assumption. There is
no utility-tariff dataset behind this site and no national one stays true; the engine takes the visitor's
three rates off their own bill, with a small named-utility default table (Pepco R-PIV, PG&E E-ELEC, ConEd)
marked as examples. Condition: **the share-allocation model must be rebuilt, not copied** (§2.3). It also
needs a demand-charge input — several 2026 TOU riders add a peak-demand component the review's model
cannot see.

**Defer to Q1 — Yard & OPE TCO.** A genuine five-year TCO with labour shadow-wage and a year-4 Li-ion pack,
but it is snow-blower season and mower math is a spring question. Q1, and only if the Tools & Equipment
pillar shows traffic. The snow-blower half could ship in November if asked.

**Article, not engine — Energy-monitor payback.** The review's inputs are vendor-marketing detection rates
(77% / 96% / 99%) applied to a $300 device. Two of the three are unverifiable, the decision is small-dollar,
and a wrong answer is cheap but the credibility cost is not. Write the piece about why single-clamp
disaggregation struggles with inverter loads; do not build a calculator on a vendor's own accuracy claim.

### 2.3 Code review: do not paste the drop-in engines

The second review offers `wellroost-decision-engines.ts` as importable. Two defects are demonstrated here;
both are silent and both would ship.

**Bug 1 — the TOU share allocation overcounts energy by β.** The code computes
`off = 0.65 − effectivePeakShare + 0.5 × shift` where `effectivePeakShare = peak − shift`. Because the
shifted share is removed from peak *and* added back at 1.5× into off-peak, the three shares sum to
**1 + β**, not 1:

| | peak | off | super-off | Σ | annual saving |
| --- | --- | --- | --- | --- | --- |
| Review's code | 0.200 | 0.510 | 0.410 | **1.120** | **$356.33** |
| Corrected | 0.200 | 0.390 | 0.410 | 1.000 | **$582.05** |

At the review's own defaults ($950/mo base, 35 miles/day, 3.1 mi/kWh) the bug understates the arbitrage by
63% — it would tell a household that a switch worth $582/yr is worth $356/yr, and at other inputs it flips
the sign. Correct form: `off = 1 − effectivePeak − superOff`, which holds the identity by construction.

**Bug 2 — the published break-even is not the inverse of the model.** `breakEvenPeakShare` is a closed form
that ignores the `0.5β` weights. Solved by bisection against the model it claims to invert, the true
break-even peak share is **61.18%**; the code prints **46.43%**. A household at 50% peak share gets "Trap
Warning — stay on flat rate" while its own cost function says switching saves money.

**Rule for every engine here:** a break-even or "ceiling" is computed by solving the model numerically
(bisection to 1e-9), never by a hand-derived closed form, and a property test asserts
`savingsAt(publishedBreakEven) ≈ 0`. A closed form that drifts from its model is worse than no number,
because it is the number the page leads with.

**Bug 3 — a magic floor that manufactures the answer.** In the CLUE engine,
`npvNonrenewal += max(fairPlan − baseline, 0.75 × baseline)` books a permanent 75%-of-premium loss even
when the FAIR plan is cheap. An unexplained constant doing structural work: justify it with a source or
delete it and let the FAIR-plan spread speak.

**Bug 4 — false precision on probabilities.** `nonrenewalProbPct: 6` reads as measured. It is not (§2.2).

**Bug 5 — the linear points-to-rate rule.** 25 bps per point applied to 5.32 points is not a 2026 rate
sheet. Cap it, label it, and let the visitor enter the lender's actual bid — the bid is the truth.

None of this justifies discarding the review: the formulations are sound and the portfolio thinking is
good. It justifies writing our own engines against the fixtures in §9 rather than importing untested
financial code into a site whose whole proposition is that the math is visible and correct.

---

## 3. Shared platform work (before the second engine)

### Task 0.5 — Test harness before anything else

Twelve engines with zero automated checks is the defect, and both source documents contain material
arithmetic errors caught this session by computing. Vitest is the Vite-native runner; the project already
runs Vite 7, so there is no second build pipeline.

**Files:** `package.json` (+ `"test": "vitest run"`), `vitest.config.ts`,
`src/lib/calculators/__tests__/amortization.test.ts`

1. `npm i -D vitest`; confirm `npm run build` still passes before anything else.
2. Assert `pay(400000, 0.0325, 360) → 1740.83` and `pay(400000, 0.0325, 324) → 1856.02` against the
   existing helpers in `moveOrImprove.ts`.
3. `npm test` → pass. The harness is proven before twelve engines depend on it.

### Task 1 — Amortization core

`calculateMonthlyPayment` and `calculateProspectiveBalance` live in `moveOrImprove.ts`; six new engines
need both, and a fourth needs the inverse. Copying them is how two implementations drift by a cent and then
by a payment.

**Files:** create `src/lib/calculators/amortization.ts` (+ `paymentFactor`, `balanceAfter`,
`monthsToTarget`, `solveReliefToCurtailment`); modify `moveOrImprove.ts` to import and re-export so
`MoveOrImproveCalculator.tsx` keeps its path. Verify: `npm test`, `npm run check`, `npm run build`.

### Task 2 — Consolidate the registry

The hub hardcodes `calculatorTools[0..2]` paired with hardcoded `vibeAssets` keys
(`src/pages/calculators/index.astro:11-30`). Adding twelve tools by index is exactly the card-slug /
engine-slug drift `vibeAssets.ts` exists to prevent, and cannot prevent while the pairing lives in a page.

**Files:** create `src/lib/calculators/registry.ts` (one array of
`{ tool, asset, takes, returns, wave, status }` plus `liveEngines()` / `plannedEngines()`); modify
`metadata.ts` (all twelve at `status: 'Planned'`, widened slug union); modify `index.astro` (render from the
registry, H1 becomes `` `${live} calculators.` ``, planned tools listed without links — a link to a 404 is
worse than no link); modify `vibeAssets.ts` (twelve identities, one commit).

**Verify:** `npm run build`, then confirm every rendered `data-asset-slug` exists in `vibeAssets.ts`, and
click through the three live engines with devtools open to see `view` fire.

### Task 3 — `macro2026.ts`

```ts
/**
 * Every macro default the 2026 engines use, with the date it was true.
 * Engines import from here; none types a rate into a component.
 * `asOf` is printed in the UI: a default that silently ages is a wrong answer wearing a right answer's clothes.
 */
export const MACRO_2026 = {
  asOf: '2026-10-24',
  mortgageRate: 0.0732,                 // Freddie Mac PMMS, 2026-10-22
  fedFundsTarget: [0.0375, 0.0400],     // FOMC, 2026-09-16
  conformingLimit: { baseline1Unit: 832750, highCostCeiling1Unit: 1249125 },   // FHFA 2026
  medianExistingPrice: 417500,          // NAR, 2026-09 release
  inventoryMonthsSupply: 4.8,
  tax: {
    standardDeductionSingle: 16100, standardDeductionJoint: 32200,
    saltCap: 40400, saltPhaseoutThreshold: 505000, saltPhaseoutRate: 0.30, saltFloor: 10000,
    mortgageInterestCap: 750000
  },
  helocRateBand: { low: 0.074, high: 0.082 },
  transactionFriction: { brokerCommission: 0.06, terminalRoundTrip: 0.07 }
} as const;
```

### Task 4 — `taxShield.ts`

Shared by rent-vs-buy (#5), TCO (#4) and down-payment (#10). Implements §1.4 exactly, phase-down as a
visible row. Tests: single $95k → $5,059; joint $240k → $3,307; joint $560k (cap $23,900) → $4,581.

---

## 4. Wave 1 — Defense, no new data (≈1 week)

### Task 5 — Recast vs Refinance
**Route** `/calculators/recast-vs-refinance/` · **slug** `mortgage-recast-ledger` · **category** `CAPITAL STRUCTURE`

Files: `src/lib/calculators/recast.ts` (+ types), `react/RecastCalculator.tsx`,
`pages/calculators/recast-vs-refinance.astro`, test.

**Inputs:** unpaid principal, note rate, months remaining, curtailment, servicer fee, market refi rate,
refi closing cost %, alternative-deployment return.

**Outputs:** recast P&I, monthly and annual relief, fee payback in months, refi P&I at market rate (same
remaining term *and* a fresh 30-year), refi closing cost in dollars, cumulative comparison at 5/10/15 years,
and the guaranteed-tax-free-return framing of curtailment versus deploying the same cash.

**Primary affordance — the inverse:** "target relief → required curtailment", from
`curtailment = relief / paymentFactor(rate, remaining)`. This is the headline, and the reason it is not a
me-too recast calculator.

**Gates that refuse rather than guess:** loan above $832,750 → "above the 2026 conforming baseline; recast
is a conventional-conforming feature — confirm with your servicer" (high-cost counties unmodeled, said out
loud); FHA/VA/USDA → recast unavailable, refi still modeled; curtailment below $5,000 → "below the typical
$5,000–$10,000 minimum".

**Fixtures:** $400,000 @ 3.25% / 324 remaining → $1,856.02; $50,000 curtailment → $232.00/mo, $2,784.03/yr,
payback 1.08 mo at $250. Property test: relief independent of balance.

**Page copy hook (copy:check clean):** "A recast re-amortizes the balance you already have at the rate you
already locked. It is the only restructuring that keeps a 3.25% note."

### Task 6 — HELOC / ARM Stress Test
**Route** `/calculators/heloc-arm-stress/` · **slug** `floating-rate-stress-test` · **category** `CARRY COST`

Files: `floatingRate.ts` (+ types), `react/FloatingRateCalculator.tsx`, page, test.

Inputs: product, balance, current rate, margin, per-adjustment and lifetime caps, next reset, remaining
term. Outputs: rate-path table at +25/50/100/200 bps, monthly delta per step, cumulative extra interest at
12 and 36 months, interest-only → fully-amortizing step, lifetime-cap ceiling payment, and "how much rate
movement exhausts a $X cushion". Refuses any path above the lifetime cap, naming the cap.

**Fixtures:** $44,000 IO at 7.40% → $271.33; at 7.65% → $280.50 (+$9.17 per 25 bps).

### Task 7 — Insurance Deductible & Coverage Gap
**Route** `/calculators/insurance-coverage-gap/` · **slug** `coverage-gap-audit` · **category** `CARRY COST`

Files: `insuranceGap.ts` (+ types), `data/components.ts` (shared with Task 13),
`react/InsuranceGapCalculator.tsx`, page, test.

Inputs: Coverage A, flat deductible, per-peril % deductibles, roof material/age, ACV vs RCV basis, open-claim
status. Outputs: dollar figure per peril deductible, worst-case simultaneous cash call, ACV depreciation gap
from age ÷ expected life against replacement cost, second-check recovery countdown, total liquid exposure.
Refuses to estimate the carrier's depreciation schedule — it shows `replacement × (1 − age/life)` and names
the schedule as the adjuster's call.

**Fixtures:** $500,000 × 5% named storm = $25,000; a 15-yr roof on a 20-yr life against $22,000 settles near
$5,500 — a $16,500 gap.

### Wave 1 exit criteria
`npm test` green · `npm run copy:check` green · `npm run check` clean · `npm run build` green · all three
reachable from `/calculators/` · `view` fires on each with field names only · no page prints a number for an
input state it claims not to model.

---

## 5. Wave 2 — Ownership cost, concessions, claims (≈2 weeks)

### Task 8 — Jurisdiction dataset
Create `src/lib/calculators/data/jurisdictions.ts`. Per jurisdiction: state, county scope, assessment ratio,
equalization, effective residential rate range, reassessment rule (annual / acquisition-value / cyclical),
tax cap, appeal deadline, filing fee, contested share, median award. Seed the seven from the brief (TX, CA,
IL-Cook, IL non-Cook, OH, GA, NY-municipal) plus **MD-Montgomery**, which `data/zipTaxes.ts` already seeds,
so the two agree.

**Hard rule:** every consumer renders `coverage`, and on a miss prints the modeled list and refuses to
compute. No national-average fallback. A made-up property tax rate is the worst kind of silent fallback,
because the visitor believes it.

### Task 9 — True Cost of Ownership / Escrow Step-Up
**Route** `/calculators/true-cost-of-ownership/` · **slug** `escrow-true-cost` · **category** `OWNERSHIP COST`

```
outflow = (P + I) + T_reassessed + I_indexed + HOA + M_predictive
T_reassessed = (price × assessmentRatio − exemptions) × millage / 12
I_indexed    = quoted annual premium / 12 + flood rider           (never invented for an unmodeled state)
HOA          = dues + (reserveFunding < 70% ? modelled special assessment / 36 : 0)
M_predictive = Σ(component replacement × remaining-life weight) / 12       [data/components.ts]
```
Outputs: year-1 outflow in five rows, the same at years 5 and 10 with per-line escrow inflation, the seller's
current tax bill versus the post-sale step-up as an explicit delta, and the share of outflow that is not
debt service.

**Fixture:** CA acquisition-value reset — $650,000 purchase at a 1.12% effective rate against a $4,800
seller's base-year bill → ≈$7,280/yr, a $2,480 jump the listing's "taxes: $400/mo" line hides.

### Task 10 — Outflow-Parity Rent vs Buy
**Route** `/calculators/rent-vs-buy/` · **slug** `outflow-parity-ledger` · **category** `MOVE VS IMPROVE`

```
W_own(t)  = V0(1+g)^t × (1 − C_sell) − B(t) + S_owner(t)
W_rent(t) = S_rent(t) + deposit growth
break-even = min t where W_own(t) − W_rent(t) > 0
```
Inputs: price, down payment %, mortgage rate (default 7.32%), term, appreciation `g` (1.0–2.3% band), rent,
rent growth, investment return, `C_sell` (6–8%), maintenance, insurance, and **the tax shield from Task 4 —
modelled, not toggled off** (rev 1 had this wrong; §1.4). Outputs: break-even year, terminal wealth at
3/5/7/10, the year the buy path stops being behind, and a sensitivity grid over appreciation × investment
return. Prints "beyond 15 years" rather than a number when the crossing is outside the horizon.

### Task 11 — Seller Concession: Buydown vs Points vs Price Cut
**Route** `/calculators/seller-concession/` · **slug** `concession-buydown-arbitrage` · **category** `OWNERSHIP COST`

Three paths on one credit `K`, plus the excess case:

- **A — price cut:** `price − K`, loan `(price − K)(1 − d)`, P&I at note rate, **and the property-tax basis
  falls with it** (join `jurisdictions.ts`).
- **B — permanent points:** `K / L0 × 100` points on a capped, editable points-to-rate curve; sunk if the
  buyer refinances.
- **C — 2-1 buydown:** `K_2-1 = 12[PMT(r0) − PMT(r0−2%)] + 12[PMT(r0) − PMT(r0−1%)]`; when `K > K_2-1`,
  route the excess and say so. Unused-escrow credit at an early payoff is an **explicit toggle** quoting the
  agreement language (Fannie B2-1.4-04), not an assumed refund.

Outputs: P&I per path, five-year cumulative cash, the tax-basis delta on path A, the payoff credit on path C
at months 12/18/24, and a break-even hold period per path.

**Fixtures:** $417,500, 10% down ($375,750), 7.32%, $20,000 credit → A: $2,457.49 P&I; B: 5.32 pts → 5.99% →
$2,250.23; C: $8,884 escrow ($489.92 / $250.45), $11,116 excess.

### Task 12 — Claim or Self-Pay (CLUE)
**Route** `/calculators/claim-or-self-pay/` · **slug** `claim-or-self-pay` · **category** `CARRY COST`

Immediate payout, five-year NPV of surcharge and lost claim-free discount, expected penalty weighted by a
**disclosed, banded** nonrenewal probability, and the self-pay ceiling `deductible + E[penalty]`. The ceiling
is the headline — "absorb up to $X before filing makes sense" — with a ±50% sensitivity band on `p_drop`
(§2.2, §2.3).

**Fixtures:** defaults → ceiling $8,288, E[penalty] $5,788, a $6,500 job nets −$1,788 → self-pay; one prior
claim and an 18-year roof → `p_drop` 0.56.

### Task 13 — Component Lifecycle & Sinking Fund
**Route** `/calculators/capital-sinking-fund/` · **slug** `capex-sinking-fund` · **category** `CAPEX UNDERWRITING`

`data/components.ts` carries the InterNACHI/DOE life and 2026 cost ranges (condenser 7–15 yr / $6.5k–$11k;
furnace 15–25 / $4.5k–$8.5k; split heat pump 10–15 / $8k–$14k; tank WH 6–12 / $1.8k–$3.2k; architectural
shingle 20–25 / $12k–$22k; dishwasher ~9 / $0.8k–$1.6k; refrigerator 9–13 / $1.5k–$3.5k), each row with
`source`, `asOf`, and the maintenance lever. Model: Weibull wear-out hazard (`k ≈ 3`, exposed and editable),
not a straight line. Outputs: monthly contribution over 1/3/5 years, a 12-month replacement calendar,
fund-already-spent by age, and the counterfactual on an 18-month 0% card then 24.99%.

### Wave 2 exit criteria
Wave 1 gates, plus: every jurisdiction surface exercised on a modeled **and** an unmodeled state, with the
refusal state captured in the PR — the refusal *is* the feature.

---

## 6. Wave 3 — Jurisdiction, evidence, financing (≈2 weeks)

### Task 14 — Property Tax Appeal Feasibility
**Route** `/calculators/property-tax-appeal/` · **slug** `assessment-appeal-audit` · **category** `PROPERTY TAX`

**Scope change from the brief:** it assumes the engine sources comps within 0.5–1.0 miles and six months.
There is no MLS feed here and inventing comps is fabrication. **The visitor supplies 3–6 comps**; the engine
does the arithmetic they cannot — ratio conversion, adjustment grid, millage, NPV.

```
impliedFMV   = assessedValue / assessmentRatio
adjustedComp = salePrice × Π(1 + adjustment_i)        // $/sqft, beds, baths, garage, lot, condition, age
annualDelta  = (impliedFMV − median(adjusted)) × assessmentRatio × millage
NPV          = Σ annualDelta/(1+d)^t − filingFee − contingency% × firstYear
```
Verdict: ≥10% → worth filing; 5–10% → marginal; <5% → below threshold. Every adjustment in dollars and
editable, so the visitor sees the answer is their comps, not our opinion. Export via `formatScenarioPacket`
as an evidence packet — jurisdiction, every ratio and rate with its source, the comp grid, the arithmetic,
the deadline. Refuses: no comps → no verdict; unmodeled jurisdiction → the modeled list. Never the word
"appraisal".

**Fixture:** assessed $100,000 at a 25% ratio → implied $400,000; a $350,000 comp set leaves a $12,500 excess
assessed base.

### Task 15 — Down Payment & PMI Arbitrage (+ DPA, covered states only)
**Route** `/calculators/down-payment/` · **slug** `down-payment-arbitrage` · **category** `OWNERSHIP COST`

PMI math (always ships): tiered premium by LTV band, the month LTV reaches 80% (borrower-requested
cancellation) and 78% (automatic termination), cumulative PMI along each path, liquidity left at closing — a
balance-sheet comparison, not a monthly-payment one. DPA math (scoped): `data/dpaPrograms.ts` starts with
**Maryland**, the one state `zipTaxes.ts` already models — income limit, forgivable second vs grant, max
amount, and the first-lien rate surcharge DPA-sponsored loans often carry. One state, labelled, beats fifty
stale ones. Expansion order comes from public population data, never telemetry: sending a state code would
break the field-names-only contract.

### Task 16 — Unpermitted Work / Retroactive Permit Risk
**Route** `/calculators/unpermitted-work/` · **slug** `permit-regularization-risk` · **category** `CAPEX UNDERWRITING`

```
C_permitted  = fee + plans + Σ (Δassessed × millage)/(1+d)^t
C_retro      = fee × penaltyMultiplier + engineerLetter + destructiveExposure + P(fail) × remediation
C_sellAsIs   = sqftUnpermitted × $/sqft × appraisalHaircut + buyerConcession
```
All three side by side, with the appraisal haircut (50%–100% GLA exclusion) and penalty multiplier (≈2×) as
editable, sourced assumptions. Cross-links Remodeling ROI at the decision point.

### Task 17 — TOU & EV Load Arbitrage (conditional on the rebuild)
**Route** `/calculators/tou-ev-arbitrage/` · **slug** `tou-load-arbitrage` · **category** `ENERGY`

Build **after** §2.3's two defects are fixed and asserted: shares sum to exactly 1 (property test over a β
sweep), and the break-even is solved by bisection with `savingsAt(breakEven) ≈ 0`. Rates come from the
visitor's bill, with a small named-utility example table. Adds a demand-charge input the review's model
lacks. **Fixtures:** flat $2,871.38 vs TOU $2,289.33 → $582.05 saving; break-even peak share 61.18% (the
review's closed form prints 46.43%).

### Wave 3 exit criteria
Full gate set, plus one exported appeal packet read as if by a board clerk — the packet is the deliverable,
not the screen.

---

## 7. Deferred

- **Yard & OPE TCO** — Q1, mow season. The snow-blower half could ship in November if the Tools & Equipment
  pillar shows traffic; ask before building.
- **Energy-monitor payback** — article, not engine (§2.2).
- **Energy credits** — folded into Remodelytics at zero (§1.2).

---

## 8. Files

```
src/lib/calculators/amortization.ts               new  — core + paymentFactor/balanceAfter/monthsToTarget
src/lib/calculators/registry.ts                   new  — single listing for the hub
src/lib/calculators/metadata.ts                   mod  — 12 planned entries, slug union
src/lib/calculators/taxShield.ts                  new  — itemization test + SALT phase-down
src/lib/calculators/data/macro2026.ts             new  — dated assumptions
src/lib/calculators/data/jurisdictions.ts         new  — 7 jurisdictions + MD
src/lib/calculators/data/components.ts            new  — life / cost / maintenance table
src/lib/calculators/data/dpaPrograms.ts           new  — MD only
src/lib/calculators/{recast,floatingRate,insuranceGap,ownershipCost,rentVsBuy,
                     concessionBuydown,claimOrSelfPay,sinkingFund,taxAppeal,
                     downPayment,permitRisk,touArbitrage}.ts + *Types.ts      new ×12
src/lib/calculators/moveOrImprove.ts              mod  — re-export amortization
src/lib/calculators/remodelytics.ts               mod  — 25C term to zero, dated
src/lib/vibeAssets.ts                             mod  — 12 identities, one commit
src/components/calculators/react/*Calculator.tsx  new  — 12 islands
src/pages/calculators/*.astro                     new  — 12 pages
src/pages/calculators/index.astro                 mod  — registry-driven, count-driven H1
src/lib/calculators/__tests__/*.test.ts           new  — one suite per engine
package.json, vitest.config.ts                    mod/new — test runner
docs/tool-baseline-2026.md                        new  — provenance + dataset coverage
```

**Reused, not rewritten:** `useVibeTelemetry` (view, debounced `input_change`, `complete` at 4 fields plus an
explicit export), `usePersistedInputs` (multivariable engines only, versioned key, restore announced),
`formatScenarioPacket` + `copyText`, `CurrencyInput` / `StepperInput` / `SelectField`, `CalculatorShell`,
`getCalculatorSchema`.

**No Supabase migration needed:** `vibe_asset_telemetry.asset_slug` is free text and `event_type` already
carries the five-value check constraint; the new slugs write through the existing INSERT-only policy.

---

## 9. Verification

Per task: `npm test` on that engine's fixtures, `npm run copy:check`, `npm run check`, `npm run build`.
Per wave: `npm run check:crawl https://wellroost.com` after deploy (sitemap, robots, canonical, 404), and a
live pass confirming the telemetry badge reflects the build rather than the intent.

**Fixture ledger** — every number below was computed in this session:

| Engine | Assertion |
| --- | --- |
| amortization | 400000/0.0325/360 → 1740.83 · /324 → 1856.02 |
| recast | balance after 36 = 375173.23 · recast on 325173.23 @324 → 1508.82 · relief 232.00 · payback 1.08 mo |
| floating rate | 44000 IO @7.40% → 271.33 · @7.65% → 280.50 |
| insurance gap | 500000 × 5% → 25000 · 15/20-yr roof on 22000 → 16500 gap |
| tax shield | single 95k → 5059 · joint 240k → 3307 · joint 560k (cap 23900) → 4581 |
| ownership cost | CA reset: 650000 × 1.12% → 7280/yr |
| rent vs buy | equal-start portfolios; W_own − W_rent at t=5 within ±1% of a hand-computed case |
| concession | L0 375750 · 5.32 pts → 5.99% → 2250.23 · price cut → 2457.49 · 2-1 escrow 8884, excess 11116 |
| claim or self-pay | ceiling 8288 · E[pen] 5788 · net −1788 on a $6,500 job · 1 prior + 18-yr roof → p 0.56 |
| sinking fund | 8-yr water heater (6–12 yr) → nonzero 12-mo hazard, zero at 2 yr |
| tax appeal | assessed 100000 at 25% → implied 400000 · $350k comp set → 12500 excess base |
| tou arbitrage | flat 2871.38 vs TOU 2289.33 → 582.05 · break-even 0.6118 by bisection |

---

## 10. Risks and open questions

1. **Assumption rot.** Rates and limits move quarterly; a page printing a stale conforming limit as fact is a
   liability. Mitigation: one dated module, visible `asOf`, limits used as gates with a banner, provenance in
   `docs/tool-baseline-2026.md`.
2. **Dataset breadth vs honesty.** Seven jurisdictions is thin for a national site. The refusal state has to
   feel like service, not a wall.
3. **Borrowed constants.** Both source documents supply probabilities, detection rates and penalty multipliers
   with no source. Each is either sourced or exposed as a labelled assumption with a sensitivity band — never
   printed to two significant figures as if measured (see `p_drop`).
4. **Duplicate value.** TCO, down-payment and sinking fund all touch reserve math; rent-vs-buy and
   move-or-improve both answer "should I stay". Shared modules prevent two answers to one question, and each
   page states which question it answers in its first sentence.
5. **Copy gate.** `scripts/vibe/lexicon.json` bans `comprehensive`, `solutions`, `leverage`, `landscape`,
   `powerful`, `innovative`, `streamline`, `unlock`, `elevate`, `holistic`, `seamless`, `robust`, `effortless`,
   `in today's`, `when it comes to`. Both source documents are full of them; every headline written for these
   pages must pass `copy:check` before the build will ship.
6. **Doc drift.** `docs/vibe-marketing-architecture.md` describes `src/components/VibeAssetCard.tsx`, which
   does not exist. Fix it while the hub is refactored, or the next agent builds against a card that was never
   there.
7. **Capacity.** Twelve engines is 8–10 focused weeks, not a quarter-end sprint. Waves are exit-gated so a slip
   lands on Wave 3, never on Wave 1 quality.

**Open questions for Jorge:**
- Twelve engines across four pillars — or six done to the site's standard? The plan sequences so that stopping
  after Wave 2 still leaves a coherent, defensible suite. This is the one decision that changes everything
  below it.
- Maryland alone for DPA at launch, or add a second state?
- Should planned tools appear on `/calculators/` before they are live?
- Ship the snow-blower half of the yard TCO in November, or hold it all to Q1?

---

## 11. Non-goals

- No automated comp sourcing, MLS or parcel integration, no assessor scraping.
- No server-side calculation, no account, no stored scenario beyond `localStorage`.
- No visitor values in telemetry — field names and counts only.
- No energy-credit engine while §25C/§25D are repealed and state rebate status moves weekly.
- No imported third-party engine code: formulations are welcome, unverified arithmetic is not.
- No change to the three live engines' math beyond driving the 25C term to zero.
