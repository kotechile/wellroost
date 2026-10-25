# Calculators: Utility and Monetization Plan

**Status:** proposed · 2026-10-25
**Scope:** the 15 engines under `/calculators/`, the shared math in `src/lib/calculators/`, and the
distribution surface around them.
**Out of scope:** articles, WordPress, the brand system.

---

## Goal

Turn fifteen free calculators into (a) a set of tools people return to and share, and (b) four
revenue channels that do not break the site's stated promise. Every phase below ships on its own and
is measurable before the next one starts.

## Principles this plan is constrained by

These are not preferences — they are already written into the product and the build, and a
monetization plan that ignores them gets rejected by the codebase or by the reader:

1. **No gate on the math.** `src/lib/leads.ts` states it: the model is usable and exportable without
   an email. Charging is allowed only for *data the visitor does not have* (lookups, batch, exports),
   never for the calculation.
2. **"No sales call at the end"** is on the hub (`src/pages/calculators/index.astro`), the homepage
   CTA and the footer. The default offer model is therefore **outbound links the visitor chooses**,
   not a form that sells their phone number. The one exception (Phase 4, "get three bids") changes
   that sentence honestly rather than quietly.
3. **Every engine prints its formulas.** An offer may never influence a number, a verdict or the
   order of results. Offer code reads the outcome; it never writes one.
4. **The copy gate is real.** `npm run copy:check` runs as `prebuild` and fails the build on
   `scripts/vibe/lexicon.json` violations. Offer copy will be written to pass it, not baselined
   around. No "unlock", no "exclusive", no "trusted partners".
5. **Field names, never values.** `vibe_asset_telemetry` stores no input values. Offers and the MCP
   server inherit that rule: a partner gets a category and a verdict, not the visitor's income.

---

## What already exists (leverage, with paths)

| Piece | Where | What it gives us |
|---|---|---|
| 15 engines as pure typed functions | `src/lib/calculators/*.ts` — `runRecast`, `runClaimDecision`, `runTou`, `runPermitRisk`, … | Already server-safe. This is why the MCP/API channel is cheap here and expensive elsewhere. |
| One registry, one asset key | `registry.ts` + `vibeAssets.ts` | `toolSlug` and `asset.slug` are the join keys for offers, telemetry and API tools. |
| Interaction telemetry | `src/lib/telemetry.ts`, `useVibeTelemetry.ts` → `vibe_asset_telemetry` | `view`, `input_change`, `complete`. `complete` already carries `{ action: 'save_pdf' }`. |
| Scenario export | `src/lib/scenarioPacket.ts`, `scenarioPdf.ts` | A packet with a **verdict line** and the source path — the artifact an offer attaches to. |
| Lead capture + delivery | `src/lib/leads.ts` → `vibe_lead_intents` (`pending_n8n_sync`), `n8n/lead_reports_workflow.json` | Email capture, consent versioning, and a working n8n pickup that emails the report. |
| Per-engine structured data | `src/lib/calculators/metadata.ts` | `SoftwareApplication` JSON-LD already emitted; the base for citation SEO. |
| Four family bands + marks | `registry.ts` `FAMILIES`, `src/lib/calculators/glyphs.ts` | A ready taxonomy for grouping offers by buyer type. |

## The four gaps (each one blocks a channel)

1. **No normalized outcome.** Only 6 of 15 engines expose a `verdict`, and each has its own union
   (`'self-pay'|'borderline'|'file'`, `'stable'|'watch'|'exposed'`, `'file'|'marginal'|'below'|
   'insufficient'`, …). Nothing can route on "what did the math conclude" across the family. **Blocks
   every outcome-driven offer and the MCP contract.**
2. **No state in the URL.** Nothing reads `location.search`; grep for `URLSearchParams` returns only
   `src/lib/wordpress.ts`. So a shared link is not a scenario, and a partner/citation link cannot
   point at a computed result. **Blocks citation SEO, return traffic, and the whole MCP funnel.**
3. **No offer surface.** No component, config, disclosure page or event exists for a CTA that is not
   an internal link. **Blocks channels 1, 2 and 4.**
4. **No server-side access to the engines.** The site is a static Astro build on Coolify; the engines
   run in the browser. **Blocks the B2B/API channel** until something serves them.

---

## The offer model

One typed config, one component, one rule: **the offer is a function of the verdict, never a
function of the visitor's wallet.**

### `src/data/offers.ts`

```ts
export type OfferKind = 'affiliate' | 'directory' | 'internal';

export interface Offer {
  id: string;                     // telemetry key, stable forever
  assetSlug: string;              // engine it may appear on
  /** Rendered only when the engine's normalized verdict is one of these. */
  verdicts: string[];
  kind: OfferKind;
  /** One factual sentence. Passes copy:check or the build fails. */
  title: string;
  body: string;
  href: string;
  /** Required for kind 'affiliate' and 'directory': who is paid, and how. */
  disclosure?: string;
  /** ISO date the partner terms were last verified — a dead affiliate link is a bug. */
  verifiedOn: string;
  status: 'live' | 'paused';
}
```

`<OutcomeOffer offer={…} outcome={…} />` renders nothing when `verdicts` does not include the
outcome, when `status` is `paused`, or when `PUBLIC_OFFERS_ENABLED !== 'true'`. Affiliate and
directory links get `rel="sponsored nofollow"` and render `disclosure` inline — not in a footer, not
in a tooltip.

### Verdict → buyer, per engine

Derived from the result types in the repo, not from a wish list.

| Engine | Trigger the code can already see | Highest-value, lowest-risk offer |
|---|---|---|
| `claim-or-self-pay` | `verdict: 'self-pay'` (surcharge exceeds payout) | Contractor directory for bids, paid out of pocket. Explicitly *not* an insurance product. |
| `unpermitted-work` | `cheapest` path + `maxExposure` high | Permit expeditor / structural engineer / real-estate attorney directory; downloadable concession memo. |
| `property-tax-appeal` | `verdict: 'file'`, `annualDelta` > cost to file | Contingency appeal firms (they take a share of the reduction). Highest intent on the site. |
| `seller-concession` | `best: 'price-cut'\|'points'\|'buydown'` | Mortgage broker intro for the winning structure. **Legal review required — see §6.** |
| `recast-vs-refinance` | `paybackMonths` finite, `refinance` comparison | Refi/lender affiliate; only when the recast actually wins. |
| `heloc-arm-stress` | `verdict: 'exposed'` | Lender intro. **No offer at `'stable'`.** |
| `insurance-coverage-gap` | `'gap-dominated'` / `'deductible-dominated'` | Insurance broker, roof inspection. No offer at `'covered'`. |
| `tou-ev-arbitrage` | `verdict: 'switch'` | Hardware affiliate: smart panel, load monitor, L2 charger. |
| `capital-sinking-fund` | `next[]` component inside 24 months | Home-warranty or HVAC/service plan — test, do not assume. |
| `down-payment` | `assistance.verdict: 'take-it'`, PMI cancellation month | Lender / PMI-removal intro. |
| `rent-vs-buy` | `breakEvenYear` beyond the stay horizon | Buyer's agent intro; long-horizon, lower urgency. |
| `remodeling-roi` | `BasicRecommendation: 'worth-it'` | Design-build / contractor directory. |
| `move-or-improve`, `remodelytics`, `true-cost-of-ownership` | Ledger deltas, MAO, `monthly` | Nobody until there is a partner we would name in public. |

Three engines get **no offer at all** in Phase 2. An offer on every page is how the site starts
reading like a lead farm; a verdict that says "you are fine" is the product working, and putting a
seller under it destroys that.

---

## Phases

Wave exit gates are repeated where the work stops, not just here. The standard gate is:

```bash
npm run copy:check && npm run check && npm run test && npm run build
```

### Phase 0 — the outcome contract (≈2 days)

**Objective:** one normalized verdict per engine, so anything downstream can route on it.

**Files**
- Create: `src/lib/calculators/outcome.ts` — `EngineOutcome` type, `severity`, `direction`, and a
  `toOutcome` adapter per engine, registered in one map keyed by `toolSlug`.
- Modify: each engine module gains a `toOutcome(result): EngineOutcome` next to its `runX`. The
  mapping stays beside the numbers it reads, not in a switch statement two directories away.
- Test: `src/lib/calculators/__tests__/outcome.test.ts` — every registry slug has an adapter, every
  adapter is total over its own verdict union, and a `severity: 'neutral'` outcome never yields an
  offer id.

**Design**
```ts
export interface EngineOutcome {
  toolSlug: string;
  /** Stable key, stored in telemetry and sent to partners. Renaming one breaks history. */
  verdict: string;
  severity: 'act' | 'consider' | 'neutral';
  /** One line the engine computed — already the sentence the page prints. */
  headline: string;
  /** The number the verdict rests on, in dollars per year unless the engine says otherwise. */
  value?: number;
  /** Which way the visitor should move; the only field an offer may branch on. */
  direction?: 'stay' | 'move' | 'file' | 'self-pay' | 'switch' | 'appeal' | 'refinance';
}
```
`severity: 'neutral'` is a first-class result, not a missing one: it is what makes "no offer" a
designed case rather than an oversight.

**Exit:** `outcome.test.ts` covers 15/15 slugs; `npm run test` green; nothing rendered differently
yet — this phase must be invisible on the site.

### Phase 1 — state in the URL (≈2 days)

**Objective:** a link that *is* a scenario. Prerequisite for citation SEO and for the MCP funnel.

**Files**
- Create: `src/lib/scenarioState.ts` — `encodeState(toolSlug, inputs) → string`,
  `decodeState(search, schema) → Partial<Inputs>`. Base64url over a compact JSON object carrying
  `{ v: 1, s: toolSlug, i: inputs }`.
- Modify: the React islands (`src/components/calculators/react/*.tsx`) hydrate initial state from
  `location.search` once, and `history.replaceState` a throttled `?state=` as inputs change.
- Modify: `src/lib/telemetry.ts` — record `entry: 'state' | 'direct'` on the `view` event, so shared
  traffic is separable from organic.

**Rules**
- Decode is **validated against the engine's input types and clamped**; a hand-edited URL may not
  produce a different number than the form could.
- `BaseLayout` already builds the canonical from `Astro.url.pathname`, so a `?state=` URL
  self-canonicalises to the bare path. Verify this — do not assume it stays true.
- Nothing in the state is emailed, logged or sent to telemetry beyond its presence.

**Exit:** round-trip test in `src/lib/__tests__/scenarioState.test.ts`; a bad `?state=` falls back to
defaults without throwing; `dist/` canonical for `/calculators/recast-vs-refinance/?state=…` is the
bare path; `npm run check:crawl <origin>` still passes after deploy.

### Phase 2 — outcome offers on three engines (≈1 week)

**Objective:** first revenue surface, deliberately small: `property-tax-appeal`,
`claim-or-self-pay`, `unpermitted-work` — three verdicts with an unambiguous buyer and no lending
regulation attached.

**Files**
- Create: `src/data/offers.ts` (empty array, typed), `src/components/calculators/OutcomeOffer.astro`
  (static wrapper) and `.tsx` if the offer needs the live outcome from an island.
- Create: `src/pages/disclosure.astro` — affiliate and directory policy, one page, linked from every
  `rel="sponsored"` offer and the footer.
- Modify: the three calculator islands to render `<OutcomeOffer>` under the result band.
- Migration: `supabase/migrations/20261026_vibe_telemetry_offers.sql` — widen the `event_type`
  check constraint to include `offer_impression` and `offer_click` (the current constraint is a
  closed enum; an added event is dropped with a 400 the browser only logs).
- Modify: `src/lib/telemetry.ts` payload type.

**Exit gate**
- Offers render only for the mapped verdicts; a `neutral` outcome shows nothing (assert in a
  component test, not by eye).
- Kill switch: `PUBLIC_OFFERS_ENABLED=false` build renders zero offers — verify in `dist/`.
- `npm run copy:check` green with the new strings.
- `/disclosure/` in the sitemap and reachable from the footer.

### Phase 3 — deterministic chaining, the "property CFO" without an LLM (≈1 week)

**Objective:** the genuinely useful idea in the brief, at zero marginal cost. One visitor decision
that needs three engines, answered on one page by carrying outputs into inputs.

**First chain only:** *"I'm selling a house with an unpermitted basement — regularize, disclose, or
walk?"* → `permitRisk` (`maxExposure`, `cheapest`) → `moveOrImprove` (sale friction, ledger) →
`claimOrSelfPay`-style absorb ceiling. Route: `/calculators/decision/[chainSlug]/`.

**Files**
- Create: `src/lib/calculators/chain.ts` — `ChainStep { toolSlug, mapFrom: (prev) => inputs }` and a
  single `CHAINS` entry. Adapters are explicit functions; no reflection, no `any`.
- Create: `src/pages/calculators/decision/[chain].astro` + a React island that renders each step's
  verdict in order with the carried numbers named.
- Modify: `registry.ts` only if the chain needs to appear on the hub (it should — as one row).

**Why not the LLM widget yet:** an on-site chat costs per token, adds latency, can hallucinate a
number the deterministic engines would never produce, and is invisible to a crawler. The chain gives
the visitor the same synthesis with `?state=` links between steps. The LLM belongs on the *outside*
(Phase 4), where the caller's own model does the conversation and our server does only the math.

**Exit:** the chain renders end-to-end from one URL; every step's numbers match the standalone
engine for the same inputs (fixture test using the individual `runX` functions).

### Phase 4 — the MCP server and the API (≈2 weeks)

**Objective:** distribution to people who already have an assistant, and the only channel that sells
to professionals without needing their attention on our site.

**Corrections to the brief, before anything is built**
- **Not SSE.** The brief says "remote SSE". Streamable HTTP replaced HTTP+SSE in MCP spec
  `2025-03-26` and is what the current spec documents (`modelcontextprotocol.io/specification/
  2026-07-28/basic/transports/streamable-http`). Build Streamable HTTP; an SSE endpoint would be dead
  on arrival in most current clients.
- **Not a workspace refactor yet.** Extracting `@wellroost/engine` as a package is the right end
  state but wrong first move: it rewrites 57 import statements across 26 files for one consumer.
  Instead bundle the existing `src/lib/calculators/` with esbuild into `mcp/dist/engine.mjs` (one
  build script, no source churn), and extract the workspace package in Phase 5 when the second
  consumer actually exists.
- **A static Astro build cannot host this.** The endpoint is a separate small Node service on the
  same Coolify host (`mcp/`), importing the bundle. Note `docs/crawl-and-indexing.md`: a push does
  not deploy while the Coolify webhook returns 401 — verify on the live origin.

**Files**
- Create: `packages/mcp/` — `src/server.ts` (Streamable HTTP), `src/tools.ts` (one tool per engine,
  Zod input schema mirroring the engine's input interface), `src/build-engine.mjs`, `README.md`.
- Create: `src/lib/calculators/canonicalUrl.ts` — builds
  `https://wellroost.com/calculators/<slug>/?state=<encoded>` from Phase 1's encoder. **Never
  hand-built strings**: the MCP server and the site must encode identically or every citation 404s.
- Create: `src/pages/llms.txt.ts` — the tool list with one-line descriptions and canonical links.
  Cheap, and it is what an agent reads first.
- Pro tier (only after the free tier has real calls): `mcp_api_keys` + `mcp_usage` tables, key
  issuance, per-key metering, `401` without a key, rate limit per IP on the free tier.

**Tool contract** — every result carries the citation, not just the number:
```jsonc
{
  "outcome": { "verdict": "self-pay", "severity": "act", "headline": "…", "value": 2400 },
  "figures": { "surcharge_3yr": 2400, "payout_net": 3100, "absorb_ceiling": 7000 },
  "assumptions": { "rate": 0.06, "horizon_years": 3 },
  "canonical_report_url": "https://wellroost.com/calculators/claim-or-self-pay/?state=…",
  "disclaimer": "Model on the visitor's own inputs. Not advice."
}
```
`canonical_report_url` is the entire distribution thesis: an agent that cites us must cite a URL a
human can open and move sliders in. That needs Phase 1 to be real.

**Exit gate**
- MCP Inspector connects over Streamable HTTP and lists 15 tools; a call returns the shape above.
- Every `canonical_report_url` in a full sweep returns 200 and renders the same verdict the tool
  returned (script it; do not spot-check three).
- The free tier is rate-limited and cannot be used to enumerate inputs (no per-address lookups until
  Phase 5, because no live data exists yet).
- Listed on at least one directory (Glama / Smithery / MCP registry), which is the actual traffic
  test for this channel.

### Phase 5 — the paid channels, only when the free ones prove demand

Nothing here is scheduled. Each item has a numeric precondition, because building billing before
traffic is how side projects acquire a Stripe account and no customers.

| Channel | Precondition | What it is |
|---|---|---|
| Pro MCP tier ($29/mo, brief's figure — unverified) | ≥20 distinct MCP callers/month on the free tier | Authenticated endpoint, batch comparison across properties, co-branded PDF. |
| "Property Decision Pass" ($14 one-time, brief's figure) | ≥25 email captures/month on scenario export | **Data enrichment only** — address → AVM, utility tariff, local cost multiplier. Never the math. Paid API credits + storage of an address means a privacy review and a retention policy first. |
| White-label widgets for pros | A named design partner in writing | Embeddable engine with their palette; the engine stays ours to fix. |
| "Get three bids" lead form | Legal review of §6 complete | The only surface that contradicts "no sales call" — and it would change that sentence honestly. |

---

## Measurement

Added to the existing funnel in `docs/vibe-telemetry.md`, not a parallel one:

```
view → input_change → complete → offer_impression → offer_click → vibe_lead_intents row → partner payout
```

| Event | Key fields in `metadata` |
|---|---|
| `offer_impression` | `offer_id`, `verdict`, `severity` |
| `offer_click` | `offer_id`, `verdict`, `position` |
| `complete` | existing, plus `action: 'save_pdf' \| 'copy' \| 'state_link'` |

The report that decides whether any of this worked: **conversion by verdict, not by page.** An
engine whose offers never convert should lose its offers; an engine with one verdict that converts
three times should get more of them. A per-page number hides exactly that.

## Compliance and trust (do these in Phase 2, not later)

1. `/disclosure/` page; `rel="sponsored nofollow"` on every paid link; disclosure text inline at the
   offer, in the same font, not a grey footnote.
2. **Mortgage and insurance referral payments need counsel.** Fees for referring settlement-service
   business are the most regulated corner of this plan; the safe default is a flat advertising rate or
   a partnership that is not per-referral, and the safest Phase 2 categories are the contractor,
   permit and tax-appeal directories. Do not price per-lead to a lender on the strength of a blog post.
3. Lead routing needs a category-level consent, versioned like `CONSENT_TEXT_VERSION`, naming who may
   contact the visitor and about what.
4. No offer may render before a verdict exists — assert this in code, since it is the one rule that
   keeps the calculators from becoming brochures.
5. Retargeting pixels are out. They are the fastest way to make a site that says "no account, no
   email" start feeling like it is watching.

## Figures in the brief I have not verified

The pasted brief asserts $25–150 per qualified lead, $9–29 per pass, $29–99/mo for white-label and
3–10% affiliate commission. **None of those is checked against a real program, and the plan does not
depend on them.** Before Phase 2 writes a single `href`, each candidate program gets a row in
`src/data/offers.ts` with its actual rate and a `verifiedOn` date. A plan that budgets on a
round number from a strategy doc is a plan that misses.

## What this plan deliberately does not do

- **No display ads.** At this traffic AdSense pays cents and the ad unit would be the only element on
  the page not set in Instrument Serif or Geist.
- **No paywall, no "pro" tier on the calculators themselves.**
- **No LLM widget on the site** (Phase 3 explains the deterministic substitute).
- **No paid data feeds** until Phase 5's capture number is met; public sources (EIA tariffs, DSIRE
  incentives, Census ACS) cover enough of the gap to test demand for free.
- **No offer on a neutral verdict**, ever.

## Decisions I need from you

1. **Offer model:** outbound links the visitor clicks (preserves "no sales call", ships in Phase 2)
   or a bid-request form (higher lead value, changes the promise, needs counsel)? *Default in this
   plan: links.*
2. **MCP priority:** is the server a traffic play (free, public, listed) or a product (paid, gated)?
   *Default: traffic first, billing only at the precondition.*
3. **Partner reality:** do you have any actual partner conversations today? If yes, Phase 2 should
   start with those three engines instead of mine — a working rate beats a better-margin guess.

## Risks

| Risk | Mitigation |
|---|---|
| Offers make the site read like a lead farm and kill the one differentiator | Verdict-gated rendering, no offer on neutral, inline disclosure, kill switch, and a hard rule: the offer lives *below* the answer, never beside it. |
| Regulatory exposure on lending/insurance referrals | Phase 2 excludes them; counsel before Phase 4's form. |
| `?state=` links create duplicate-content or index noise | Canonical already strips query — verify per phase, and keep `?state=` out of the sitemap. |
| MCP server drifts from the site's math | The server imports the same modules through one bundle; a fixture test runs each tool against `runX` and fails on drift. |
| Affiliate links rot | `verifiedOn` per offer plus a monthly `npm run check:offers` that HEADs every live href. |
