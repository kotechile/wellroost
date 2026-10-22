# Vibe marketing — operating the interactive assets

The protocol itself lives in `skill.md` (voice, structure, 95/5 split) and `lexicon.md` (terms).
This file covers the machinery those files assume, because the assets are worthless as an
acquisition channel if nothing records what a visitor did with them.

## What is already live

`asset_slug` is the join key. It comes from `src/lib/vibeAssets.ts` — one declaration per asset, imported
by both the card and the engine. Card and engine used to carry their own slug literals, and they drifted
(`relocation-friction-ledger` on the hub vs `move-or-improve` in the engine), so a click had no matching
engine view. Do not type a slug anywhere else.

| Surface | Island | `asset_slug` | Events |
| --- | --- | --- | --- |
| `/calculators/` asset cards | `client:visible` | per card | `view`, `engage` |
| `/calculators/remodeling-roi/` | `client:load` | `equity-arv-recovery-engine` | `view`, `input_change`, `complete` (copy) |
| `/calculators/move-or-improve/` | `client:load` | `relocation-friction-ledger` | `view`, `input_change`, `complete` (copy) |
| `/calculators/remodelytics/` | `client:load` | `remodelytics-underwriter` | `view`, `input_change`, `complete` (copy/print/email) |

All three engines now have a real export action, so `complete{trigger:'export'}` is available everywhere:
"Copy scenario" on the two lighter engines (`copy_scenario`), and copy / print / email on Remodelytics
(`export_packet`, `print_packet`, `email_scenario`). The copy is a plain-text packet
(`src/lib/scenarioPacket.ts`) for the two homeowner-facing engines and JSON for the underwriting one.
The field-count threshold still fires for anyone who models without exporting — it is the fallback
proxy, never the conversion.

Event semantics:

- `view` — the island hydrated on screen. Cards use `client:visible`, so this means *seen*, not
  merely served.
- `engage` — a card CTA was clicked, immediately before the navigation.
- `input_change` — debounced 1200 ms, with `metadata.fields` = the names of the fields the visitor
  touched. **Field names only, never values.** Nested fields are emitted with their path
  (`friction.zipCode`, `renovation.quoteAmount`); before that fix, three of the four update paths in
  the relocation engine emitted nothing, so most of that engine's inputs were invisible.
- `complete` — two different facts, both under the same event type:
  `complete{trigger:'field_threshold'}` is a **proxy** ("four distinct fields touched, they modelled
  something"); `complete{trigger:'export'}` is the real conversion. They are separate rows on
  purpose, and every row carries `session_id`, so the funnel counts sessions per stage rather than
  adding rows — otherwise the proxy would inflate completion and the export would be lost.
- `session_id` — random per tab, `sessionStorage`, no identity behind it. Also written on the lead
  row from the same visit.

## Wiring the sink (one-time, ~5 minutes)

Telemetry is build-time, not runtime: Astro inlines `PUBLIC_*` into the bundle. A container that
receives these as runtime env ships a bundle whose values are already `undefined`.

1. Apply the migrations — `supabase/migrations/20261020_vibe_asset_telemetry.sql` (table + INSERT-only
   policy for `anon`) and `20261023_vibe_asset_telemetry_session.sql` (`session_id`, which the funnel
   needs). There is deliberately no `select` policy: the anon key is public, so a select policy would
   publish the whole event log.
   **Apply the `session_id` migration before deploying the bundle that sends it** — PostgREST answers
   `400` to an INSERT naming a column the table lacks, and the browser only logs it.
2. Set the build args on the Coolify application (Configuration → Environment Variables, and mark
   them as build-time / available at build):
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_TELEMETRY_WEBHOOK_URL` (optional, e.g. n8n)
3. Redeploy. The badge next to "Interactive Acquisition Engines" on `/calculators/` appears only
   when a sink is configured — if it is missing, the build has no sink, and the browser console says
   so on the first event.

## Optional email capture

`src/components/ModelExportForm.tsx`, rendered inside an engine (currently Remodelytics, the one with
an export packet). Rules:

- **Never a gate.** The model and `Copy underwriting packet` work with an empty form. The card CTA
  reads "Open Full Multivariable Engine →" so nothing looks like a wall.
- **One purpose, stated on the button's own line:** "We will only use your email to send this
  scenario report. You can unsubscribe at any time." A new notice means bumping
  `consent_text_version` in `src/lib/leads.ts`, which is what the row records.
- **No fake success, and no fake delivery.** If `PUBLIC_SUPABASE_URL`/`ANON_KEY` are absent the form
  renders "Email delivery is not configured on this build" and says the copy action still works.
  When the row is accepted the label says "Request received", not "Sent": a `201` from the lead table
  proves the row exists, and the packet is mailed by the n8n `lead_reports_workflow` poll, which runs
  every five minutes and sets `delivered_at` only after SMTP accepts it.
- Leads land in `vibe_lead_intents` (the estate's existing lead table — no third table for the same
  fact), which is separate from the event table: identified person + submitted scenario in one place,
  anonymous events in another. It must be deletable without the other. Columns this front end sets:
  `session_id`, `asset_slug`, `vertical_slug` (`wellroost`), `domain_category`, `email`,
  `intent_type` (`model_export`), `consent_text_version`, `calculated_metrics` (`asset_title`,
  `source_path`, `domain`, and the scenario packet itself).

A lead is the strongest completion signal available, so `onSent` raises `complete{action:'email_scenario'}`
on the parent's telemetry hook. The form itself does not call the hook — a second registration there
would emit a phantom `view` for a pseudo-asset on every mount.

## Persistence (localStorage)

`src/lib/usePersistedInputs.ts`, used by the two multivariable engines (`move-or-improve`,
`remodelytics-underwriter`). Quick or single-field surfaces deliberately reset.

- Restore in an effect, never during render — a static build reading `localStorage` while rendering
  produces a hydration mismatch.
- Only keys the current schema knows are restored (`allowedKeys`), so a renamed field cannot inject a
  stale value into the model.
- The restore is **announced** with `PersistenceNotice` and a `Start fresh` escape that clears the
  snapshot. Silently showing different numbers than last visit reads as a bug on a financial model.
- Storage key is versioned: `wr:model:<asset>:v<n>`.

## n8n webhook: the two things that make it 404

The front end's second sink is a webhook (`PUBLIC_TELEMETRY_WEBHOOK_URL`, accepted alias
`PUBLIC_N8N_WEBHOOK_URL` — the name the Coolify app actually carries). Both spellings are read;
a variable that is configured but ignored because it was named differently is the failure mode this
module exists to prevent.

What a 404 on `https://n8n.giniloh.com/webhook/vibe-telemetry` means, and what it does not:

```json
{"code": 404, "message": "The requested webhook \"POST vibe-telemetry\" is not registered."}
```

That is n8n saying **no workflow owns that path** — not that the workflow is inactive, and not a
network problem. Check what n8n actually holds before editing anything:

```bash
# read-only; n8n keeps its workflows in sqlite at the volume below
python3 - <<'PY'
import json, sqlite3
db = "/var/lib/docker/volumes/<n8n-volume>/_data/database.sqlite"
con = sqlite3.connect(f"file:{db}?mode=ro&immutable=1", uri=True)
for _id, name, active, nodes in con.execute("select id,name,active,nodes from workflow_entity"):
    paths = [ (n.get("parameters") or {}).get("path") for n in json.loads(nodes)
              if "webhook" in (n.get("type") or "").lower() ]
    if paths: print(_id, name, bool(active), paths)
PY
```

Requirements for the browser to reach it, all three:

1. **A workflow exists whose Webhook node path is exactly `vibe-telemetry`** (n8n serves production
   webhooks at `/webhook/<path>`), and it is **Active**. Import `n8n/vibe_telemetry_workflow.json` (see `n8n/README.md`),
   activate it, and the 404 becomes 200.
2. **CORS on the Webhook node** (`allowedOrigins: *`). The call is cross-origin from
   `wellroost.com`; without it the OPTIONS preflight fails and the browser blocks the POST silently.
3. **`responseMode: onReceived`** for fire-and-forget telemetry — the caller should not wait on the
   workflow's downstream nodes before the page continues.

Telemetry goes to n8n for *side effects only*. Events and leads are written to Supabase directly by
the browser, so a workflow that re-inserts them duplicates every row.

## Reading the data

Funnel per asset — **count sessions, not rows**, or a reload inflates `view` and the threshold proxy
inflates `complete`:

```sql
with s as (
  select asset_slug, coalesce(session_id, 'legacy:' || id::text) as session_id, event_type
  from vibe_asset_telemetry
  where created_at > now() - interval '30 days'
)
select asset_slug,
       count(distinct session_id) filter (where event_type = 'view')         as views,
       count(distinct session_id) filter (where event_type = 'engage')       as engages,
       count(distinct session_id) filter (where event_type = 'input_change') as engaged,
       count(distinct session_id) filter (where event_type = 'complete')     as completed,
       round(100.0 * count(distinct session_id) filter (where event_type = 'complete')
             / nullif(count(distinct session_id) filter (where event_type = 'view'), 0), 1) as completion_pct
from s
group by 1
order by views desc;
```

`coalesce(session_id, 'legacy:' || id)` keeps rows written before the `session_id` column from
collapsing into a single bogus visitor; each legacy row counts as its own session, which is the best
available assumption and never merges two real visitors.

Which export actually converts:

```sql
select asset_slug, metadata->>'action' as action, count(distinct session_id) as sessions
from vibe_asset_telemetry
where event_type = 'complete' and metadata->>'trigger' = 'export'
  and created_at > now() - interval '30 days'
group by 1, 2 order by 1, 3 desc;
```

`asset_slug` is the join key between a card, an engine and its traffic. A card with high `view` and
zero `engage` is a copy problem (see `skill.md`); an engine with high `engaged` and low `completed`
is an input-friction problem. A **missing** middle — card `engage` > 0 but engine `view` = 0 — means
the two surfaces disagree on the slug, which is the failure `src/lib/vibeAssets.ts` now prevents.

## Adding an asset

1. Declare it once in `src/lib/vibeAssets.ts` (slug, category, title, description, metricsPreview,
   href). The hub card and the engine both import that entry — a second copy of the slug is what
   breaks attribution.
2. Build it as an island (`client:load` for an engine, `client:visible` for a card), and pass the
   registry entry straight to the hook: `useVibeTelemetry(vibeAssets.<asset>)`.
3. Call `onInputChange(fieldName)` from the component's single input-update path — including nested
   paths (`friction.zipCode`). A nested updater that skips it silently deletes those inputs from the
   funnel. Call `onComplete({ action })` from every export action (copy, print, email).
4. Never send input values — names only.
5. `npm run check:lexicon` (also runs in the image build).
