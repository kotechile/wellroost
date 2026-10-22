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

### Component Architecture: `VibeAssetCard.tsx`
Located at `src/components/VibeAssetCard.tsx`:
- White panel matching `design-language.md` and the adjacent cards (`border-gray-200`, navy text,
  `#1d6ae5` primary action). It was `zinc-900` glassmorphism, the only dark surface on an otherwise
  white editorial page and a style the design language does not define.
- Category pill (`border-blue-100 bg-blue-50 text-blue-700`).
- Version badge (`Interactive Asset v1.0`) and, on the CTA, `data-asset-slug` so the rendered page can
  be checked against the telemetry slug by eye.
- Direct Smart Brevity copy hook with key formula/metrics preview.
- The CTA is an `<a href>` to the engine (navigation semantics: middle-click, open-in-new-tab, visible
  URL), instrumented with `engage` on click.
- Identity comes from `src/lib/vibeAssets.ts`; the card carries no slug literal of its own.

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
