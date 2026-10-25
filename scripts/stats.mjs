#!/usr/bin/env node
/**
 * The audience snapshot: the one command that answers "how many people actually used this".
 *
 * Why a script and not a dashboard: at 31 sessions the question is not "what is the trend", it is
 * "is there anyone here at all". A committed markdown file with dated numbers is the artifact a
 * partner can read, and it is the only way this stops living in one person's head.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/stats.mjs --days 30
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/stats.mjs --days 30 --write
 *
 * `--write` rewrites docs/audience-snapshot.md. Without it, the report goes to stdout so a run can be
 * inspected before it lands in a committed file.
 *
 * The service key is required, and its absence is a failure rather than an empty report: `anon` holds
 * INSERT only on these tables (by design), so a script that "falls back" to it would print a confident
 * zero for a site with traffic. That is the exact failure mode this file exists to prevent.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(ROOT, 'docs/audience-snapshot.md');
const SITE = 'https://wellroost.com';

function arg(name, fallback) {
	const i = process.argv.indexOf(`--${name}`);
	if (i === -1) return fallback;
	const value = process.argv[i + 1];
	return value && !value.startsWith('--') ? value : true;
}

/**
 * Read the key from the environment, or from .env.local — never from .env, which is the public
 * browser key. A service key in .env would be inlined into the client bundle by anyone who
 * imported it; keeping the two files separate is the cheapest guard available.
 */
function serviceKey() {
	if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
	try {
		const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
		const line = env.split('\n').find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
		if (line) return line.slice('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
	} catch {
		/* no .env.local: fall through to the error below */
	}
	return null;
}

const key =
	serviceKey() ??
	(() => {
		console.error(
			'[stats] SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
				'        The anon key cannot read these tables (INSERT-only by policy), so this script refuses\n' +
				'        to print numbers it cannot verify. Set it in .env.local or the environment.'
		);
		process.exit(1);
	})();

const url = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ixfdkninqeqmwuxncpvh.supabase.co';

/**
 * PostgREST has no arbitrary-SQL endpoint, so the funnel is read with three plain REST queries and
 * assembled here. Fewer moving parts than adding an RPC to the database for a reporting script.
 */
async function select(table, params) {
	const qs = new URLSearchParams(params).toString();
	const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
		headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
	});
	if (!res.ok) throw new Error(`${table} ${res.status}: ${(await res.text()).slice(0, 300)}`);
	return res.json();
}

const days = Number(arg('days', 30)) || 30;
const since = new Date(Date.now() - days * 864e5).toISOString();
const write = arg('write', false) === true;

const events = await select('vibe_asset_telemetry', {
	select: 'asset_slug,event_type,session_id,metadata,created_at',
	created_at: `gte.${since}`,
	limit: '10000'
});

const leads = await select('vibe_lead_intents', {
	select: 'asset_slug,vertical_slug,created_at,status',
	vertical_slug: 'eq.wellroost',
	created_at: `gte.${since}`,
	limit: '1000'
});

// ── aggregate ────────────────────────────────────────────────────────────────────────────────
const byEngine = new Map();
const sessions = new Set();
const entry = { direct: 0, referral: 0, state: 0, unknown: 0 };
const totals = { view: 0, input_change: 0, complete: 0 };
const exports = { save_pdf: 0, copy: 0 };
/** A view with no input is a bounce; a session that moved a field is engagement. */
const engagedSessions = new Set();

for (const e of events) {
	const row = byEngine.get(e.asset_slug) ?? {
		slug: e.asset_slug,
		views: 0,
		inputs: 0,
		completes: 0,
		sessions: new Set()
	};
	if (e.event_type === 'view') {
		row.views += 1;
		const via = e.metadata?.entry;
		if (via === 'referral' || via === 'state' || via === 'direct') entry[via] += 1;
		else entry.unknown += 1;
	}
	if (e.event_type === 'input_change') {
		row.inputs += 1;
		if (e.session_id) engagedSessions.add(e.session_id);
	}
	if (e.event_type === 'complete') {
		row.completes += 1;
		const action = e.metadata?.action;
		if (action === 'save_pdf') exports.save_pdf += 1;
		if (action === 'copy') exports.copy += 1;
	}
	if (e.session_id) {
		row.sessions.add(e.session_id);
		sessions.add(e.session_id);
	}
	if (e.event_type in totals) totals[e.event_type] += 1;
	byEngine.set(e.asset_slug, row);
}

const rows = [...byEngine.values()].sort((a, b) => b.views - a.views);
const leadsByAsset = new Map();
for (const l of leads) leadsByAsset.set(l.asset_slug, (leadsByAsset.get(l.asset_slug) ?? 0) + 1);

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
const today = new Date().toISOString().slice(0, 10);

const table = [
	'| Engine | Sessions | Views | Inputs | Completes | Leads |',
	'|---|---:|---:|---:|---:|---:|',
	...rows.map(
		(r) => `| \`${r.slug}\` | ${r.sessions.size} | ${r.views} | ${r.inputs} | ${r.completes} | ${leadsByAsset.get(r.slug) ?? 0} |`
	)
].join('\n');

const report = `# Audience snapshot — ${today}

Generated by \`node scripts/stats.mjs --days ${days} --write\`. Do not hand-edit; rerun it.
Window: last ${days} days (since ${since.slice(0, 10)}).

## Headline

| Measure | Value |
|---|---|
| Sessions (distinct tabs) | **${sessions.size}** |
| Views | ${totals.view} |
| Sessions that touched an input | ${engagedSessions.size} (${pct(engagedSessions.size, sessions.size)} of sessions) |
| Completes | ${totals.complete} |
| Exports (PDF / copy) | ${exports.save_pdf} / ${exports.copy} |
| Email captures | ${leads.length} |
| View → complete | ${pct(totals.complete, totals.view)} |

## How people arrived

Telemetry records the field, never the person: \`entry\` is set from the URL and referrer at \`view\`.

| Entry | Views |
|---|---:|
| Referral (external link or search) | ${entry.referral} |
| Shared/cited scenario link | ${entry.state} |
| Direct | ${entry.direct} |
| Not recorded (events before this field existed) | ${entry.unknown} |

## Per engine

${rows.length ? table : '_No events in this window._'}

## Reading it

- **Sessions, not views.** A reload inflates views; \`session_id\` is per tab. Compare sessions to
  sessions and views to views.
- **Completes are the only conversion that matters.** A view with no input is a bounce; an input with
  no complete is form fatigue — which is the case for the document-extraction work in the plan.
- **Leads are counted from \`vibe_lead_intents\`, not from a telemetry event.** One is a database row a
  person typed an address into; the other is a browser beacon.
- **\`e2e-verify\` is a test row.** It is left visible rather than filtered: a report that quietly drops
  the owner's own traffic is a report that lies upward.
`;

if (write) {
	writeFileSync(SNAPSHOT, report);
	console.log(`wrote ${SNAPSHOT}`);
} else {
	process.stdout.write(report);
}
