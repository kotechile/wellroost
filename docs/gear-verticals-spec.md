# Gear verticals on WellRoost: taxonomy, boundaries, and three calculator specs

Status: verticals are **live in the factory** (registry, CMS taxonomy, routing row, cron fleet).
The calculators below are **specs, not builds** — nothing has been added to `src/` yet.

Why these exist: the site already answers "what does this home decision cost over time". These three
verticals apply the same math to the **objects** that decision buys — the segment where affiliate and
retail revenue lives, because the reader is one click from a purchase and the article can hold the
model that justifies it.

---

## 1. What shipped

| Factory vertical id | WP category (cms.wellroost.com) | Slug / hub URL | News cron | Evergreen cron |
|---|---|---|---|---|
| `yard_robotics` | 22 — Yard Robots & Automation | `yard-robotics` → `/categories/yard-robotics/` | Sat 10:30 UTC | Sat 18:30 UTC |
| `outdoor_power_equipment` | 24 — Outdoor Power & Snow Equipment | `outdoor-power-equipment` → `/categories/outdoor-power-equipment/` | Sat 11:00 UTC | Sat 19:00 UTC |
| `home_diagnostics_tech` | 26 — Home Diagnostic Tools | `home-diagnostics-tools` → `/categories/home-diagnostics-tools/` | Sat 11:30 UTC | Sat 19:30 UTC |

- Editorial vertical ids are snake_case because the dashboard, `sync_crons.py` and `vertical-sync.mjs`
  join on them; the WordPress **category** slug is hyphenated and is what the reader sees. They are
  different taxonomies and are not expected to match character for character.
- `home-diagnostics-tech` was renamed `home-diagnostics-tools` so the slug matches the category name
  and the head term ("diagnostic tools"), not a truncation of it.
- The three categories are **top-level** on purpose: `src/lib/categories.ts` only builds pages for
  categories with no parent, so a child category would exist in WordPress and 404 on the front. Making
  them siblings of Tools & Equipment is what gives each one a hub page on the next build.
- The weekday news band (10:30–13:00) and evergreen band (17:30–20:00) are full Mon–Fri, 30 jobs each.
  Saturday was the only free block that is off-peak all day; the three verticals share it in 30-minute
  steps, which is the same staggering rule the rest of the fleet follows.

## 2. The three verticals

Each entry states the thesis, the **angle boundary** (what this vertical does not cover and which
existing vertical owns it), and the commercial shape. Boundaries matter here: the fastest way to make
three new verticals worthless is to let them publish the same article as an older one.

### 2.1 `yard_robotics` — Autonomous Yard & Property Robotics

**Thesis.** Recurring yard labor is a subscription the homeowner already pays (a mowing contract, a
plowing contract). Autonomous hardware converts that subscription into a capital purchase with a
breakeven date. The 2026 inflection is navigation: wire-free LiDAR / vision / RTK finally survives a
real yard, and modular bases (Yarbo-class) promise one chassis for four seasons.

**Owns:** robot mowers, robotic snow throwers, modular yard robots, pool skimmers, dock/driveway robots —
anything that performs the task without a human pushing it.

**Does not own:**
- hand-guided battery equipment → `outdoor_power_equipment`
- hiring/contracting mechanics, SOW, retainage → `home_ops_execution`
- the mower's effect on property value → `home_equity_tco`

**Angles (registry `primary_angles`):** wire-free nav under tree cover · breakeven vs a $150–250/mo
landscaping contract · modular base vs two dedicated machines · robot vs plow contract vs heated mats ·
the installation audit (slope, gate width, zones, irrigation) · per-acre-year consumables and the
year-four battery that breaks the payback.

**Commercial shape:** $1,500–$5,000 AOV, manufacturer-direct affiliate programs, spring launch cycle
(Feb–Apr) and fall snow cycle (Sep–Nov). Highest revenue per article of the three.

### 2.2 `outdoor_power_equipment` — Electrified Fleet & Winter Ops

**Thesis.** Two-stage battery snow blowers and 56–80V platforms now do gas work without carburetors or
stale fuel — but the real decision is not the tool, it is the **battery platform** you marry. The fourth
tool on a platform is cheap; the first one on a second platform is not.

**Owns:** battery snow blowers, power shovels, heated driveway mats, cordless mowers and zero-turns,
pressure washers, leaf blowers, string trimmers — the gas-to-battery decision.

**Does not own:**
- autonomous equipment → `yard_robotics`
- standby generators, panel upgrades, V2H → `resilient_home_assets`
- service contracts and contractor scope → `home_ops_execution`

**Angles:** two-stage blower vs power shovel vs heated mat, cost per inch cleared · the battery-platform
trap across EGO / Greenworks / DeWalt FlexVolt / Ryobi · cordless vs gas torque and the maintenance tax ·
pressure washer PSI vs GPM · electric zero-turn acre-per-charge · cold-weather failure modes at -10C ·
buy-window timing (markdown vs storm).

**Commercial shape:** $300–$6,000 AOV, retailer affiliate (Home Depot / Lowe's / Ace programs).
Strictly seasonal — this vertical must publish snow angles Sep–Nov and mower/washer angles Mar–Jun or it
writes against demand.

### 2.3 `home_diagnostics_tech` — Precision Diagnostics & Maintenance Tech

**Thesis.** The highest-return "tool" in a house is not a drill, it is an instrument that makes the
invisible visible — a $250 thermal imager finding missing insulation, a $90 borescope finding the leak
before the ceiling does. One prevented call-out covers the purchase.

**Owns:** handheld and prosumer instruments — thermal imagers, moisture meters, articulating borescopes,
acoustic/ultrasonic leak detectors, outlet/circuit analyzers, combustion/CO testers, inspection cameras.

**Does not own (deliberately, and this is the boundary that keeps it from cannibalizing):**
- installed sensing that streams data — flow meters, leak sensors, CT clamps, smart shutoffs →
  `smart_home_telemetry`
- the insurance/claim math on an automatic shutoff valve, deductible break-evens, non-renewal →
  `property_loss_insurance_mitigation`
- energy-audit program rules and rebates → `home_infrastructure_lifecycle_tco`

**Angles:** sub-$300 thermal imager as a DIY energy audit · $80 borescope vs a $450 drywall repair ·
acoustic leak detection before the slab opens · pin vs pinless moisture meters and the dry-to-the-touch
lie · circuit analyzers and the bootleg ground · instrument accuracy vs price.

**Commercial shape:** $50–$600 AOV, thinnest margin, **best conversion** — the reader is mid-problem,
which is why the vertical earns its slot as a top-of-funnel feeder for the other two.

## 3. Monetization gap to close before this earns anything

There is no affiliate layer in either repo today: no link convention, no redirect, no disclosure
template, no click tracking. Articles currently cite primary sources and internal links only. Minimum
viable layer, in order:

1. **One redirect route** — `/go/<slug>/` (Astro endpoint, 302) mapping a stable product slug to the
   current merchant URL, so a dead affiliate link is a one-line fix rather than a rewrite of published
   posts. Put the map in `src/lib/gearLinks.ts`.
2. **A disclosure line** in the article template and on every hub page ("We earn a commission…"), plus
   a `/disclosure/` page; FTC material-connection rules apply to the whole site once one link earns.
3. **Click events in the existing sink** — `useVibeTelemetry` already stores field *names*; add an
   outbound `gear_click` event with `asset_slug` + product slug so the funnel ends at revenue, not at
   `complete`.
4. Only then add merchant programs. Until 1–3 exist, treat these verticals as audience-building, and
   say so in any report that calls them "monetizable".

## 4. Calculator specs

Shared contract for all three (see `AGENTS.md` "Vibe marketing contract"): Astro page under
`src/pages/calculators/<slug>.astro` using `CalculatorShell`, React island under
`src/components/calculators/react/`, pure math in `src/lib/calculators/<slug>.ts` (unit-testable, no
React), identity in `vibeAssets.ts` (one slug, imported everywhere), listing in
`calculatorTools` (`src/lib/calculators/metadata.ts`), telemetry via `useVibeTelemetry` (field **names**
only), input memory via `usePersistedInputs` for the full engines, and `formatScenarioPacket` for the
export action. White editorial styling — no dark admin panels.

Every default below is editable and labelled as a default in the UI; the article that ships with a
calculator must cite the source for the default it uses.

### 4.1 Robot vs Landscaper Payback — `/calculators/robot-payback/`

**Decision it settles:** at what month does owning a robot mower beat the crew you already pay, and
does it still win if you keep paying someone to edge and blow.

**Inputs**

| Field | Default | Note |
|---|---|---|
| `lawnSqFt` | 10,000 | total lot grass area, not lot size |
| `mowablePct` | 80 | beds, paths, pool deck excluded |
| `slopeDeg` | 10 | >20° flags "verify model rating" |
| `seasonWeeks` | 30 | mowing season in your market |
| `visitsPerWeek` | 1 | contract frequency |
| `contractPricePerVisit` | $65 | local, per cut |
| `contractInflationPct` | 4 | annual price escalation |
| `robotPrice` | $3,200 | hardware |
| `installCost` | $350 | RTK base, garage, ramp, first-year accessories |
| `kwhPerAcreYear` | 15 | default; editable |
| `pricePerKwh` | $0.18 | |
| `consumablesPerYear` | $90 | blades, wheels |
| `batteryReplaceYear` | 4 | 0 disables |
| `batteryCost` | $450 | |
| `residualLaborHoursPerYear` | 24 | edging/trim/blow the robot does not do |
| `laborRate` | $45 | what that hour is worth |
| `horizonYears` | 5 | 3–10 |

**Math**

```
acres          = lawnSqFt × mowablePct/100 / 43560
contractYearN  = contractPricePerVisit × visitsPerWeek × seasonWeeks × (1+infl)^(N-1)
robotYearN     = kwhPerAcreYear × acres × pricePerKwh + consumablesPerYear
                 + residualLaborHoursPerYear × laborRate
                 + (N == batteryReplaceYear ? batteryCost : 0)
cumulative(m)  = sum of monthly prorated outflows to month m
breakevenMonth = first m where cumulative_robot(m) <= cumulative_contract(m)
```

**Outputs:** breakeven month (or "not within horizon"), 5-year net savings, cost per acre-year for each
option, contract price at which the robot never pays back inside the horizon, and a residual-labor
callout when `residualLaborHoursPerYear × laborRate` exceeds 15% of the contract cost (the honest case
where a robot is a convenience purchase, not a saving).

**Guards:** `lawnSqFt × mowablePct < 2,000` → suppress savings and say the economics don't clear
minimum order size. `slopeDeg > 20` → separate warning, not a silent calculation. Never present the
savings figure without the residual-labor line visible.

### 4.2 Driveway Snow Clearing TCO — `/calculators/snow-clearing-tco/`

**Decision it settles:** plow contract vs two-stage battery blower vs power shovel vs heated mats, over
ten winters, priced per event and per inch cleared — including the option nobody prices honestly
(keeping the plow for big storms and the blower for the rest).

**Inputs**

| Field | Default | Note |
|---|---|---|
| `drivewaySqFt` | 900 | 20 × 45 typical two-car |
| `walkwaySqFt` | 120 | the only area mats realistically cover |
| `surface` | paved | `gravel` disables mats and power shovel |
| `eventsPerYear` | 12 | your market's plowable events |
| `avgInchesPerEvent` | 4 | |
| `clearingMode` | per-visit | `per-visit` \| `seasonal` |
| `plowPricePerVisit` | $60 | |
| `seasonalContractPrice` | $650 | used when mode = seasonal |
| `contractInflationPct` | 3 | |
| `blowerPrice` | $1,300 | two-stage 56–80V, bare tool |
| `blowerBatteryCost` | $500 | platform batteries + charger |
| `blowerLifeYears` | 8 | |
| `blowerMaintenancePerYear` | $40 | shear pins, auger wear |
| `powerShovelPrice` | $400 | `gravel` unsupported |
| `powerShovelLifeYears` | 5 | |
| `matPricePerSqFt` | $22 | installed mat + controller |
| `matWattsPerSqFt` | 35 | default; read the nameplate |
| `matHoursPerEvent` | 4 | |
| `pricePerKwh` | $0.18 | |
| `diyHoursPerEvent` | 1.0 | blower 1.0, shovel 1.8, mats 0.2 |
| `laborRate` | $0 | default 0 — value your own time explicitly |
| `horizonYears` | 10 | |

**Math**

```
plowYearN     = (mode==per-visit ? events×price : seasonalPrice) × (1+infl)^(N-1)
blowerUpfront = blowerPrice + blowerBatteryCost
blowerYearN   = maintenance + batteryPackReplacement(N==5) + diyHours×events×laborRate
shovelUpfront = powerShovelPrice
matUpfront    = walkwaySqFt × matPricePerSqFt
matYearN      = walkwaySqFt × wattsPerSqFt/1000 × matHoursPerEvent × events × pricePerKwh
costPerEvent  = 10y total / (events × horizonYears)
costPerInch   = costPerEvent / avgInchesPerEvent per 100 sq ft of cleared area
```

**Outputs:** ten-year total per option, cost per event, cost per inch per 100 sq ft, breakeven events
per year at which mats beat the blower (it is low; the real constraint is area), and a sized verdict:
walkway/steps → mats; driveway under ~800 sq ft in light snow → power shovel; heavy snow or long
driveway → two-stage blower; gravel → blower only.

**Guards:** mats are capped at `walkwaySqFt` and refuse `surface = gravel`. `avgInchesPerEvent < 2`
warns that a blower is over-buying. Electricity for a battery blower is modeled as ~0.5 kWh/charge and
reported as a line so the near-zero number is visible rather than suspicious.

### 4.3 Diagnostic Tool Payback — `/calculators/diagnostic-tool-roi/`

**Decision it settles:** which instrument to buy first, and how many uses it takes to pay for itself
given how often a scan actually finds something.

**Inputs**

| Field | Default | Note |
|---|---|---|
| `tool` | thermal imager | picker: thermal $250 · moisture meter $60 · borescope $90 · acoustic leak detector $350 · circuit analyzer $220 |
| `toolPrice` | from picker | editable |
| `usesPerYear` | 4 | honest number, not the marketing one |
| `findRate` | 0.35 | share of uses that surface a real defect |
| `avoidedCostPerFind` | $550 | diagnostic fee + the repair delta from catching it early |
| `falsePositiveRate` | 0.10 | share of uses that trigger unnecessary work |
| `falsePositiveCost` | $180 | second opinion, opening the wrong wall, returned part |
| `horizonYears` | 5 | |

**Math**

```
annualValue   = usesPerYear × findRate × avoidedCostPerFind
              − usesPerYear × falsePositiveRate × falsePositiveCost
paybackMonths = price / (annualValue/12)        // "never" when annualValue <= 0
usesToBreakeven = ceil(price / max(0, findRate×avoided − falsePositiveRate×fpCost))
```

**Outputs:** payback months, five-year net value, uses needed to break even, and the per-instrument
"what it finds that a visual inspection misses" line (insulation voids, subfloor moisture, a partially
blocked drain line, a bootleg ground).

**Guards:** `findRate ≤ falsePositiveRate` → show "this instrument is not the constraint, your process
is" instead of a savings number. Do **not** model insurance-premium effects here — that claim belongs to
`property_loss_insurance_mitigation` and is where the sourced actuarial numbers live.

## 5. Build order

1. `robot-payback` first: highest AOV, strongest keyword demand, and its residual-labor line is the
   honest differentiator against every vendor calculator.
2. `snow-clearing-tco` before October: it is the only one of the three with a hard seasonal deadline.
3. `diagnostic-tool-roi` last, but its card should ship with the other two — it is the top of the funnel.
4. Affiliate redirect + disclosure (section 3) before any of the three links to a merchant.

## 6. Verification checklist per calculator

- `npx astro build` from clean; new route present in the sitemap.
- `curl -o /dev/null -w '%{http_code}' https://wellroost.com/calculators/<slug>/` → 200 after deploy.
- Math checked against a hand-worked case in a unit test (`src/lib/calculators/<slug>.test.ts`), including
  the zero/negative branch.
- Telemetry fires `view`, debounced `input_change` (field names only), `complete` on export.
- Card slug in `vibeAssets.ts` matches the engine's slug — this is the join that broke before.
