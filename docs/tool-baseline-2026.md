# Tool baseline, 2026-10-24

Every default the engines ship with, where it came from, and how to re-check it. The rule this file
enforces is simple: a number a visitor reads as fact has a date and a source, and an assumption that
is really an assumption says so in the interface rather than in a comment nobody reads.

Re-date this file whenever `MACRO_2026.asOf` moves. A stale baseline is worse than no baseline,
because the pages keep printing it with a straight face.

---

## Verified against a primary source

| Figure | Value used | Source | Checked |
| --- | --- | --- | --- |
| 30-year fixed, weekly average | **7.32%** (prior week 7.40%, year-ago 6.19%) | Freddie Mac PMMS, week of 2026-10-22 | 2026-10-24 |
| Fed funds target range | **3.75%–4.00%**, +25bp on 2026-09-16, 12–0 | FOMC statement | 2026-10-24 |
| SEP medians | 2026 year-end 4.1%; 2026 PCE 3.7% | September 2026 SEP | 2026-10-24 |
| Median existing-home price | **$417,500**, +1.3% YoY, 39th month | NAR release, 2026-10-13 | 2026-10-24 |
| Months' supply | **4.8** (1.60M units, 3.99M SAAR) | NAR release, 2026-10-13 | 2026-10-24 |
| Conforming limit, 1-unit | **$832,750** baseline; $1,249,125 ceiling | FHFA, announced 2025-11-25 | 2026-10-24 |
| Standard deduction, 2026 | $16,100 single / $32,200 joint | IRS | 2026-10-24 |
| SALT cap, 2026 | **$40,400**, phasing down 30% of MAGI above **$505,000**, floor $10,000, reverting to $10,000 in 2030 | OBBBA §70120; CRS RL32781 | 2026-10-24 |
| Mortgage interest cap | First $750,000 of acquisition debt | IRS | 2026-10-24 |
| §25C energy credit | Not allowed for property placed in service after **2025-12-31** | IRS, P.L. 119-21 | 2026-10-24 |
| §25D residential clean energy | Not allowed for expenditures after **2025-12-31** | IRS, P.L. 119-21 | 2026-10-24 |
| HOMES / HEEHR | Still law; open in roughly 8 states, reserved in CA and CO, not participating in SD; DOE Program Notice 26-2 bans fuel-switching rebates | DOE; state energy offices | 2026-10-24 |

## Modelled assumptions, labelled as such in the interface

These are not facts about the world; they are shapes the model needs, and each is either exposed as an
editable input or printed with a sensitivity band.

| Assumption | Value | Where it appears | Why it is not sourced |
| --- | --- | --- | --- |
| Base non-renewal probability | 6% wind/hail, 18% interior water, 25% fire/liability; +35 points per prior claim; +15 for a roof ≥15 years | Claim or self-pay | Carriers do not publish underwriting thresholds. Returned as a ±50% band, never a single percentage. |
| Premium inflation | 6% a year | Claim or self-pay | A trend, not a filing. Editable. |
| Points-to-rate curve | ~25bp per point for the first two, ~12.5bp beyond, capped at 2% of rate | Seller concession | Real pricing is convex and varies by lender and day. The page takes the lender's bid. |
| Weibull wear-out shape | k = 3 | Sinking fund, ownership cost | A shape parameter. Exposed on the page; k = 1 would be memoryless. |
| Component service lives | InterNACHI ranges (see `data/components.ts`) | Sinking fund, insurance gap, ownership cost | Ranges, not point estimates, and every cost is replaceable with a quote. |
| Roof depreciation | Straight line by age over expected life | Insurance gap | The schedule endorsement decides; the page says the adjuster applies it. |
| Effective property tax rates | Seeded ranges per jurisdiction | Ownership cost, tax appeal | Millage is local and moves annually. The visitor's bill wins and the field is editable. |
| Appraisal treatment of unpermitted area | 50%–100% exclusion from GLA | Unpermitted work | A lender/appraiser judgement, not a statute. Editable. |
| Penalty multiple on unpermitted work | 2× base fee | Unpermitted work | Local schedules vary; defaulted and editable. |
| Insurance premium | $3,057 national average | Ownership cost | A placeholder until the visitor pastes a quote. Stated in the field hint. |
| Transaction friction | 6% commission, 7% round trip | Rent vs buy, move or improve | Regional and negotiable. Editable. |
| Rent growth / maintenance | 3% a year / 1% of price | Rent vs buy | Editable on the page. |

## Dataset coverage

| Dataset | Coverage | Refusal behaviour |
| --- | --- | --- |
| `data/jurisdictions.ts` | TX, CA, IL (Cook and non-Cook), OH, GA, NY municipal, MD Montgomery County | Any other jurisdiction renders the modelled list and computes nothing. No national-average substitution. |
| `data/components.ts` | Seven systems: AC condenser, gas furnace, split heat pump, tank water heater, architectural shingle roof, dishwasher, refrigerator | Always available; ages and costs are inputs. |
| `data/dpaPrograms.ts` | Maryland Mortgage Program, form of assistance only — **no dollar figures** | Any other state says so. Figures are entered from the offer letter. |
| Utility tariffs | None bundled | The visitor enters three rates from their own bill. |
| Comparable sales | None bundled | The visitor supplies three to six; the engine refuses to rule below three. |

## Deliberately not built

- **Federal energy-credit modelling.** §25C and §25D are repealed for 2026 work. The Remodelytics energy
  panel drives its 25C term to zero with a dated note rather than modelling a credit that no longer
  exists.
- **A national DPA directory.** Every program term changes with each funding round; a fifty-state table
  built from secondary sources would be a liability within a quarter.
- **Automated comparable sourcing.** No MLS or parcel feed exists behind this site, and inventing sales
  would be fabrication with a spreadsheet around it.
