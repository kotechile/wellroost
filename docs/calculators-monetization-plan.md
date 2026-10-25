# WellRoost: from 15 calculators to an audience a partner will pay for

**Status:** revision 2 · 2026-10-25 · supersedes the same-day monetization-only draft
**Scope:** `/calculators/`, the WordPress articles, the AI surface, and the route to partner revenue.

> **What changed, and why.** Revision 1 planned offer routing, an MCP server and a paid tier for a site
> that had traffic to convert. It does not. Measured this session: **31 sessions, 89 events, 3 leads —
> one of them my own end-to-end test** — and **3 of 44 articles link to a calculator**. The
> offer/MCP/billing ladder is now Appendix A, built only when a gate in §6 is met. What follows is the
> build that creates the audience that appendix can later sell to.

---

## 1. Where the site actually is (measured, not estimated)

| Fact | Value | How it was measured |
|---|---|---|
| Engines live | 15, all pure typed functions in `src/lib/calculators/` | `registry.ts` |
| Articles published | 44 posts, median 1,102 words, 9 categories | WordPress REST `X-WP-Total` |
| **Sessions, all time** | **31**, all within the last 7 days | `vibe_asset_telemetry.session_id` |
| Views / completes / leads | 75 / 7 / **3** (one is `e2e-verify`, my test) | same table, `vibe_lead_intents` |
| Articles linking to a calculator | **3 of 44** (3 links total) | link audit over post content |
| Production telemetry | **working** — the live hub serves "Interaction telemetry: on" | `curl wellroost.com/calculators/` |
| Local telemetry | **not configured** — no `PUBLIC_SUPABASE_*` in `.env` | `.env` |
| Deploy | working — the new hub with marks and family bands is live | live HTML has `glyph-tile` × 15 |
| Audience | none | — |
| Partner conversations | none | — |

Two things follow immediately:

- **The funnel works end to end.** View → inputs → verdict → PDF → email capture → `vibe_lead_intents`
  → n8n has already run on a real visitor. None of the plumbing is theoretical.
- **Nothing has been sent to it.** 31 sessions is a person testing a website, not an audience.

## 2. The structural problem: two audiences, neither served deeply

The content and the calculators point at different people.

| | Content centre of gravity | Calculator centre of gravity |
|---|---|---|
| Volume | 22 energy/efficiency, 8 smart home, 4 equipment, 2 yard robots, 4 home cost | 15 engines |
| Reader | Owner in a high-cost, high-risk state comparing running costs, tariffs, claims and equipment payback (FAIR Plan premiums, NY heat-pump rebates, a meter that reads 78%, snow robots) | Buyer/owner making a capital-structure decision (recast, HELOC, rent vs buy, seller concession, down payment) |
| Overlap | `true-cost-of-ownership`, `insurance-coverage-gap`, `claim-or-self-pay`, `property-tax-appeal`, `tou-ev-arbitrage` — **5 of 15** | the other 10: mortgage and equity math the articles never touch |
| Partner type | Insurance brokers, energy auditors, HVAC/battery/heat-pump installers, inspectors | Lenders and agents — the regulated, referral-sensitive end |

**Recommendation: lead with the energy/insurance/carrying-cost cluster.** Three reasons, in order:

1. That is where 36 of the 44 articles already are. You cannot out-write a competitor in a segment you
   have not written about.
2. The partner inventory is unregulated and pays on click or install — no per-referral fee to a
   settlement-service provider, no counsel needed before the first `href`.
3. Those partners have a demo-friendly product. "A homeowner uploads their declaration page and we
   print the cash gap on a claim" is a sentence an insurance broker acts on. "We modelled your recast
   relief" is a sentence a lender's compliance team has to review first.

The mortgage engines stay live and keep their search value. They are simply not what the first partner
conversation is about.

## 3. What a partner actually buys

Not pageviews. A partner signs when three things are true:

| Precondition | Status |
|---|---|
| **Product proof** — a tool that does something their own site cannot | ✅ Have it: 15 engines, printed formulas, 102 tests. |
| **A specific ask** — a segment, a volume, a price, a pilot length | ⬜ Needs §6's numbers. |
| **Audience proof** — "N homeowners in *your* segment completed *this* scenario last month, and X% exported the result" | ❌ The missing piece, and the only thing worth building for the next six weeks. |

That third one is not a marketing problem. It is a distribution step in front of a measurement that
already exists — `vibe_asset_telemetry` plus `vibe_lead_intents` will produce that sentence by itself
once people show up in one segment instead of fifteen.

---

## 4. The build, in order

Standard gate for every phase, plus the phase's own exit criteria:

```bash
npm run copy:check && npm run check && npm run test && npm run build
```

### Phase A — make measurement honest (½ day) — **built**

**Why first:** I could not answer "how much traffic does this site have" from the repo; I had to query
production. That will not do when a partner asks.

**Files**
- Modify: `.env` (local only, never committed) with the same `PUBLIC_SUPABASE_URL` /
  `PUBLIC_SUPABASE_ANON_KEY` the Coolify build already carries, so dev events reach the same sink.
  Today they are invisible, which is why nobody noticed the volume either way.
- Create: `scripts/stats.mjs` — one command, the funnel per engine for a window: sessions, views,
  completes, exports, leads, by `asset_slug`. Service key read from `.env.local`.
- Create: `docs/audience-snapshot.md` — the weekly output of that script, committed. A partner cannot
  argue with a dated file, and it stops the numbers living in one person's memory.
- Modify: `src/lib/telemetry.ts` — add `entry: 'direct' | 'referral' | 'state'` to the `view` payload so
  a shared or cited link is separable from organic. (The 5-value `event_type` check constraint in
  `supabase/migrations/20261020_vibe_asset_telemetry.sql` does not change: this rides inside
  `metadata`.)

**Exit:** `node scripts/stats.mjs --days 30` prints the funnel; the numbers in
`docs/audience-snapshot.md` match production; `copy:check` green.

### Phase B — connect what already exists (1–2 weeks, most traffic per hour on the site) — **built, awaiting prose anchors**

**Why:** 3 of 44 articles link to a calculator. The site is 44 dead ends pointing at nothing, and the
calculators carry no internal link equity. This is the cheapest traffic available here and it needs no
new content.

**Files**
- Create: `scripts/link-audit.mjs` — every post → engine pair where the topic overlaps, matching the
  post's own words against each engine's `keywords` in `registry.ts`. It emits a checklist, not a
  patch: **every link is added by a human**, because a wrong link costs a reader.
- Modify: `src/pages/[slug].astro` — render a `DecisionTool` block when a post carries a `tool_slug`
  value, so the link appears with the calculator's promise rather than as a bare anchor. The pairing
  lives in WordPress (custom field or `calculators` taxonomy), not in a hardcoded map: it is editorial
  data and the CMS is the editorial system.
- Modify: `src/components/calculators/CalculatorPage.astro` — the "related" rail already exists;
  populate it from the same pairing so the link runs both ways.
- Create: `docs/content-map.md` — post ↔ engine ↔ category matrix, regenerated by the audit script.

**Exit gate**
- The audit's "post mentions a covered topic without linking its engine" count reads 0.
- Every engine page shows at least one real article; no placeholder, no empty rail.
- `npm run check:crawl <origin>` green, and no post links to an engine whose inputs it never discusses.

### Phase C — distribution, one engine a week (4 weeks, then ongoing)

**Why:** at 31 sessions, SEO is a six-month bet with no compounding base. Manual distribution is the
only channel that returns signal inside a month — and it doubles as the test of whether this voice
lands with the audience the articles were written for.

**The loop, weekly, no exceptions:**
1. Pick the engine with the most articles behind it. Start: `true-cost-of-ownership`,
   `insurance-coverage-gap`, `claim-or-self-pay`, `tou-ev-arbitrage`, `property-tax-appeal`.
2. Write **one answer** to one real question where that audience already is (r/RealEstate,
   r/HomeImprovement, r/solar, r/heatpumps, BiggerPockets, a state-specific group). Answer in full in
   the thread; link the calculator only where the number is the point.
3. Record it in `docs/audience-snapshot.md`: referrer, engine, sessions, completes, leads.
4. Keep what worked; drop what did not. After four weeks, the segment with traction becomes Phase E.

**Exit:** ≥100 sessions in one segment over 30 days, and ≥10 `complete` events on one engine from
traffic that is not you. That is the number the partner conversation needs.

### Phase D — the AI capability that earns the visit (2 weeks)

"AI capabilities" is the right instinct and the wrong first build. Ranked by value per dollar, with the
non-negotiable rule stated first:

> **AI fills fields. It never does arithmetic and never states a verdict.** The deterministic engines
> own every number and every verdict, as they do today. A model computing money on this site would
> destroy the only thing that makes it credible: the printed formula.

| # | Capability | Why it is worth building | Cost |
|---|---|---|---|
| 1 | **Document → inputs.** Upload a utility bill, insurance declaration page or contractor quote; extract the 8–12 field values; prefill the engine; the visitor confirms each field before anything runs. | The form-fatigue fix the 12-input engines genuinely need, and the demo a partner understands in ten seconds. | Free for PDFs with a text layer (pdf.js, client-side); ~$0.01–0.03/use for photographs or scans. |
| 2 | **Build-time editorial work** — the Phase B pairing, the answer-first opening of each engine page, post → engine summaries. | No runtime cost, no hallucination risk (reviewed before commit), and it fixes the internal linking that is currently the site's biggest hole. | Free (runs offline, committed as content). |
| 3 | **MCP server** (Appendix A) — 15 tools, Streamable HTTP, every result carrying `canonical_report_url`. | Distribution to people who already have an assistant; the reason an AI-native partner takes the meeting. | One small Node service. |
| 4 | Conversational front door ("describe your situation") | Same value as #1 with more failure modes. Build it as a wrapper over #1, after #1 has run 100 times. | — |
| 5 | AI writing the result explanation | Template-constrained sentences only, every clause bound to a computed field. Highest hallucination risk of the five; last or never. The pages already print the arithmetic, which beats prose about it. | — |

**Phase D scope, concretely:** #1 only, on the three cluster engines, behind
`PUBLIC_AI_EXTRACT=enabled`, degrading to the manual form when no model key is present — never a dead
end, and never a silent fallback that pretends to have read a document.

**Privacy, non-negotiable:** a declaration page carries a name, an address, a policy number and an
account number. Extract client-side where possible; where server-side, send the document for extraction
and store nothing but the confirmed field values; strip identifiers before the model sees the page. This
is the item that makes a partner's compliance reviewer close the tab, so it belongs in the design rather
than in a policy page later.

**Exit:** p50 extraction < 10s; < $0.05/use; ≥30% of extraction sessions reach a `complete`; a scan and
a text-layer PDF both work; the manual path is byte-identical when the flag is off.

### Phase E — the partner pack (1 week, after Phase C's exit)

- `src/pages/partners.astro` — what the tools do, who they are for, one sentence on the maths being
  published, and a contact that is not a form on a page nobody visits.
- `docs/audience-snapshot.md` — the dated numbers, per engine, per segment.
- A demo script: one engine, one document upload, one verdict, one exported PDF. Three minutes.
- A **pilot** ask, not a rate card: 60 days, one segment, a co-branded engine page, structured as a flat
  sponsorship or click-out. The per-referral version, for lending and insurance, waits on counsel.

**Exit:** the pack exists as three files and one demo, and the ask is written down before the call.

### Phase F — Appendix A, when a gate in §6 is met

Offers, the Pro tier, white-label and paid data passes stay unbuilt until then.

---

## 5. What AI should and should not touch

| Job | Who does it | Why |
|---|---|---|
| Read a bill, quote or declaration page → field values | Model, client-side first | No other way; a wrong field is corrected by the human on the next screen. |
| Compute the payment, the verdict, the ledger | **Engine only** | 102 tests and printed formulas. A model here is a liability with a per-token price. |
| Write articles, answers, offer copy | Model drafts, human commits | `copy:check` runs on every build and fails it. That gate is why this site does not read like slop; keep it in the loop rather than around it. |
| Decide which article links to which engine | Model proposes, human disposes, the audit script verifies | A wrong link costs a reader; the script's count is the proof. |
| Rank, get cited | Nothing controls it; the page has to earn it | Answer-first opening, real data table, engine embedded, canonical clean. |

## 6. The gates

Each row is a gate, not a wish. Until one is met, the phase beside it stays unbuilt.

| Gate | Threshold | Unlocks |
|---|---|---|
| One segment has traction | ≥100 sessions / 30d in one segment, ≥10 completes on one engine from non-owner traffic | Phase E — partner conversations |
| The funnel converts | ≥25 email captures / month across the cluster | The paid data pass (Appendix A) |
| The extractor works | ≥30% of extraction sessions reach a verdict, < $0.05/use | More engines on extraction; the conversational front door |
| Tool adoption outside the site | ≥20 distinct MCP callers / month | The Pro tier |

## 7. What I would stop doing, and why

- **Publishing more articles before Phase B.** 44 posts with 3 calculator links is a library with no
  catalogue. The next article is worth less than the next link.
- **Adding engines.** 15 is far more supply than 31 sessions can absorb. The bottleneck is
  distribution, and a 16th engine is a way of avoiding it.
- **Building offers, Stripe, or the Pro tier.** Appendix A says exactly how, and every precondition in
  it is currently zero. Billing before audience is how a side project acquires a Stripe account and no
  customers.
- **Display ads.** At this traffic they pay cents, and the ad unit would be the only element on the page
  not set in Instrument Serif or Geist.

## 8. Decisions I need from you

1. **Which cluster is the company?** My recommendation is energy/insurance/carrying cost (§2) with the
   five matching engines. The alternative — all-in on the mortgage/equity engines — is viable but means
   thirty articles in a segment where partners' compliance teams gate the revenue.
2. **AI spend ceiling.** Phase D runs at ~$0.03/use worst case. Is there a monthly cap to design against
   (say $50/mo), and is kie.ai the model route as elsewhere in the estate?
3. **Pilot appetite.** Pitch with a demo and 31 sessions now (fast, weak), or spend six weeks on Phase C
   first so the ask has numbers behind it? My answer is the second.

---

## Appendix A — the offer and API model (build in Phase F)

### The offer contract

`src/data/offers.ts`, one typed record per offer, gated on a normalized outcome
(`src/lib/calculators/outcome.ts` — `EngineOutcome` with `verdict`, `severity`, `direction`). The rules
are code, not guidance:

- An offer renders only when the outcome's `verdict` is listed on the offer and `severity !== 'neutral'`.
- `PUBLIC_OFFERS_ENABLED=false` renders zero offers — verify in `dist/`, not by eye.
- Affiliate and directory links carry `rel="sponsored nofollow"` and render their disclosure inline, in
  the same font, not in a footer.
- `neutral` is a first-class outcome. "No offer" is a designed case, not an oversight.

### Verdict → buyer, per engine (from the result types, not a wish list)

| Engine | Trigger the code already sees | Offer |
|---|---|---|
| `claim-or-self-pay` | `verdict: 'self-pay'` (surcharge exceeds payout) | Contractor directory for bids paid out of pocket — explicitly not an insurance product |
| `unpermitted-work` | `cheapest` path + high `maxExposure` | Permit expeditor / structural engineer / attorney directory; concession memo |
| `property-tax-appeal` | `verdict: 'file'`, `annualDelta` > filing cost | Contingency appeal firms |
| `insurance-coverage-gap` | `'gap-dominated'` / `'deductible-dominated'` | Insurance broker, roof inspection. None at `'covered'` |
| `tou-ev-arbitrage` | `verdict: 'switch'` | Smart panel, load monitor, L2 charger |
| `capital-sinking-fund` | `next[]` failure inside 24 months | Home warranty / HVAC service plan — test, do not assume |
| `heloc-arm-stress` | `verdict: 'exposed'` | Lender intro. **None at `'stable'`** |
| `seller-concession` | `best: 'price-cut' \| 'points' \| 'buydown'` | Broker intro — **counsel first** |
| `recast-vs-refinance` | `paybackMonths` finite and the recast wins | Refi affiliate |
| `rent-vs-buy` | `breakEvenYear` beyond the stay horizon | Buyer's agent intro, long horizon |
| `down-payment` | `assistance.verdict: 'take-it'`, PMI cancellation month | Lender / PMI-removal intro |
| `remodeling-roi` | `BasicRecommendation: 'worth-it'` | Design-build directory |
| `move-or-improve`, `remodelytics`, `true-cost-of-ownership` | ledger deltas, MAO, `monthly` | Nobody until there is a partner worth naming in public |

### MCP server (distribution first, billing later)

- **Streamable HTTP, not SSE.** HTTP+SSE was replaced in MCP spec `2025-03-26`; an SSE endpoint is dead
  in current clients (`modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http`).
- **Bundle, do not refactor.** The engines stay in `src/lib/calculators/`; esbuild bundles them to
  `mcp/dist/engine.mjs`. Extracting `@wellroost/engine` as a workspace package rewrites 57 import
  statements across 26 files for one consumer — do it when a second consumer exists.
- **A static Astro build cannot host it.** Separate Node service on the Coolify host. Note
  `docs/crawl-and-indexing.md`: a push does not deploy while the webhook returns 401, so verify on the
  live origin.
- Every tool result carries `outcome`, `figures`, `assumptions`, `canonical_report_url` (built by
  `src/lib/calculators/canonicalUrl.ts` from the same encoder the site uses) and a `disclaimer`. The URL
  is the whole thesis: an agent that cites us must cite a page a human can open and move sliders in —
  which is why `?state=` encoding has to exist before any of this ships.
- Pro tier only after ≥20 distinct callers/month: `mcp_api_keys` + `mcp_usage`, per-key metering, `401`
  without a key, IP rate limit on the free tier.

### The live-data pass (the only thing worth charging for)

Charge for data the visitor does not have — an address resolving to an AVM, a utility tariff, a local
cost multiplier — never for the calculation. `src/lib/leads.ts` already states the rule: the model is
usable and exportable without an email. A paid pass means licensed feeds, a privacy review for storing
an address, and a retention policy before a dollar is taken.

### Figures from the source brief that remain unverified

$25–150 per qualified lead, $9–29 per pass, $29–99/mo for white-label, 3–10% affiliate commission. None
is checked against a real program and no phase depends on any of them. Each offer gets its actual rate
and a `verifiedOn` date before its `href` is written.
