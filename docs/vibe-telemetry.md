# Vibe marketing — operating the interactive assets

The protocol itself lives in `skill.md` (voice, structure, 95/5 split) and `lexicon.md` (terms).
This file covers the machinery those files assume, because the assets are worthless as an
acquisition channel if nothing records what a visitor did with them.

## What is already live

| Surface | Island | Events |
| --- | --- | --- |
| `/calculators/` asset cards | `client:visible` | `view`, `engage` |
| `/calculators/remodeling-roi/` | `client:load` | `view`, `input_change`, `complete` |
| `/calculators/move-or-improve/` | `client:load` | `view`, `input_change`, `complete` |
| `/calculators/remodelytics/` | `client:load` | `view`, `input_change`, `complete` (export) |

Event semantics:

- `view` — the island hydrated on screen. Cards use `client:visible`, so this means *seen*, not
  merely served.
- `input_change` — debounced 1200 ms, with `metadata.fields` = the names of the fields the visitor
  touched. **Field names only, never values.**
- `complete` — either four distinct fields (proxy) or an explicit export (`action: export_packet`,
  which also records whether the clipboard write was permitted).

## Wiring the sink (one-time, ~5 minutes)

Telemetry is build-time, not runtime: Astro inlines `PUBLIC_*` into the bundle. A container that
receives these as runtime env ships a bundle whose values are already `undefined`.

1. Apply the schema — `supabase/migrations/20261020_vibe_asset_telemetry.sql`. It creates the table
   and an INSERT-only policy for `anon`. There is deliberately no `select` policy: the anon key is
   public, so a select policy would publish the whole event log.
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
- **No fake success.** If `PUBLIC_SUPABASE_URL`/`ANON_KEY` are absent the form renders
  "Email delivery is not configured on this build" and says the copy action still works.
- Leads land in `vibe_asset_leads` (migration alongside the telemetry one), which is separate from
  the event table: identified person + submitted scenario in one place, anonymous events in another.

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
   webhooks at `/webhook/<path>`), and it is **Active**. Import `docs/n8n-vibe-telemetry.json`,
   activate it, and the 404 becomes 200.
2. **CORS on the Webhook node** (`allowedOrigins: *`). The call is cross-origin from
   `wellroost.com`; without it the OPTIONS preflight fails and the browser blocks the POST silently.
3. **`responseMode: onReceived`** for fire-and-forget telemetry — the caller should not wait on the
   workflow's downstream nodes before the page continues.

Telemetry goes to n8n for *side effects only*. Events and leads are written to Supabase directly by
the browser, so a workflow that re-inserts them duplicates every row.

## Reading the data

Funnel per asset:

```sql
select asset_slug,
       count(*) filter (where event_type = 'view')         as views,
       count(*) filter (where event_type = 'input_change') as engaged,
       count(*) filter (where event_type = 'complete')     as completed,
       round(100.0 * count(*) filter (where event_type = 'complete')
             / nullif(count(*) filter (where event_type = 'view'), 0), 1) as completion_pct
from vibe_asset_telemetry
where created_at > now() - interval '30 days'
group by 1
order by views desc;
```

`asset_slug` is the join key between a card, an engine and its traffic. A card with high `view` and
zero `engage` is a copy problem (see `skill.md`); an engine with high `engaged` and low `completed`
is an input-friction problem.

## Adding an asset

1. Build it as an island (`client:load` for an engine, `client:visible` for a card).
2. Call `useVibeTelemetry({ slug, category, title })` and pass the field name to `onInputChange`
   from the component's single input-update path; call `onComplete` from any export action.
3. Never send input values — names only.
4. `npm run check:lexicon` (also runs in the image build).
