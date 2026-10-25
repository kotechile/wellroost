# WellRoost Vibe Marketing Architecture & Implementation Guide

Standard static lead magnets and landing pages fail because modern property decision-makers and high-stakes renovators expect to experience an asset's empirical value before exchanging their email. Vibe Marketing treats every acquisition asset as an interactive micro-application—leveraging WellRoost's stack (**React, Tailwind CSS, Supabase, and Astro**) to build high-converting, embeddable decision engines hosted directly across **wellroost.com** verticals.

---

## Phase 1: Persistent Voice & Style Configuration

Brand and editorial consistency are maintained across automated asset generation via root configuration files:

1. **`skill.md`**: Dictates tone, structural formatting (Smart Brevity), and code generation rules tailored for WellRoost.
   - **Target Profiles**: High-Stakes Renovators ($20k–$150k+ CapEx), Move vs. Improve Evaluators, Energy & Systems Optimizers, Real Estate & Equity Investors.
   - **Smart Brevity**: Bold conclusion upfront, 5-second scan bullets, zero fluff.
   - **Execution Ratio**: 95% AI generation (plumbing, schemas, scaffolding) / 5% Human taste (typography, tone calibration, UX validation).

2. **`lexicon.md`**: WellRoost's authoritative domain terminology — the terms this front prefers
   over generic filler. Enforcement is not here: `scripts/vibe/lexicon.json` (vendored from the
   vibe-marketing spec) holds the banned list and `npm run copy:check` fails the build on a hit.
   - Replaces "lead magnet" with **Interactive Asset / Decision Engine**.
   - "Net Yield / ROI Engine / Equity Recovery Ledger" in positioning copy only — the search-facing
     word stays **calculator**, and H1s, nav labels and slugs are never renamed.
   - Replaces "tips" with **Precision Mechanics / Empirical Framework**.

---

## Phase 2: Building Interactive Acquisition Assets (React & Tailwind Pattern)

Instead of offering a downloadable PDF or generic form on **wellroost.com**, WellRoost embeds functional decision micro-apps that capture high intent through user interaction, instant calculation, and state persistence.

### Component architecture: the registry, not a card
`src/lib/calculators/registry.ts` pairs every tool with its asset identity, its family and its
`takes`/`returns` copy; `src/pages/calculators/index.astro` renders the hub from that one array.
There is no `VibeAssetCard.tsx` — this document described one that was never built, which is the
same drift a second hand-written list always produces. What the rows actually do:

- Category label above the title, `data-asset-slug` on the anchor so the rendered page can be checked
  against the telemetry slug by eye.
- Direct Smart Brevity hook: the description, then `takes` and `returns` side by side.
- The CTA is a plain `<a href>` to the engine (middle-click, open in a new tab, visible URL).
- Identity comes from `src/lib/vibeAssets.ts`; the row carries no slug literal of its own.

### Two exports, one packet

Every live engine offers **Copy the scenario** (plain text) and **Save as PDF** (a print document).
Both render the same `ScenarioPacket` object built once by the engine's `buildPacket()`, through
`src/lib/scenarioPacket.ts` (text) and `src/lib/scenarioPdf.ts` (print HTML) — so a saved PDF and a
pasted packet can never disagree about the numbers.

The PDF is the browser's own print dialog, whose "Save as PDF" destination is the save. No PDF
dependency ships. The document is injected as `#wr-packet-print` and `html.wr-printing` hides every
other body child while printing, so the result is a letterhead, the verdict, section tables and the
provenance footer — not the calculator chrome, inputs or navigation.

The label is the contract: `window.print()` proves the dialog *opened*, never that a file was
written, so the confirmation reads "Print dialog open — choose Save as PDF". An engine that refuses
to model a state (an unmodeled jurisdiction) disables both buttons with `disabled`.

Both exports fire the same completion event, distinguished by `action`:
`complete{trigger:'export', action:'copy_<engine>_packet'|'save_pdf'}`, plus `printed`/`clipboard`
booleans recording which half actually happened.

---

## Phase 3: The 95/5 Workflow Execution Checklist

### AI Plumbing (95%):
- **Agent Protocol**: Agents ingest `skill.md` and `lexicon.md` for tone and vocabulary, and the
  vendored `scripts/vibe/lexicon.json` for the banned list that the build enforces.
- **Supabase Telemetry Schema**: `supabase/migrations/20261019_vibe_telemetry.sql` tracks interaction events (`view`, `engage`, `deploy`, `input_change`, `complete`).
- **Telemetry Pipeline**: `src/lib/telemetry.ts` safely sends client interaction payloads to Supabase REST and n8n webhooks.
- **n8n Workflow File**: `n8n/vibe_telemetry_workflow.json` (generated) provides an importable n8n workflow for webhook handling, intent scoring, persona qualification, Supabase logging, and high-intent alerts.
- **Agentic Automation**: `scripts/n8n-webhook-handler.mjs` ingests interaction telemetry for progressive qualification and automated follow-ups.

### Human Taste (5%):
- **Typography & Tokens**: Calibrated with GT America / Geist fonts, deep navy `#000B50` and electric blue `#1d6ae5` palettes.
- **Micro-Copy Calibration**: Ensure every headline targets a quantified financial threshold (e.g. comp ARV, 70% rule MAO, heat pump COP payback).
- **Workflow Bottleneck Elimination**: Verify the tool calculates real empirical outcomes instead of vanity metrics.
