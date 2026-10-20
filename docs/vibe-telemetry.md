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
