#!/usr/bin/env node
/**
 * Which article should link to which engine — proposed, never applied.
 *
 * The measured problem this exists for: 3 of 44 posts link to a calculator. The site has 44 dead
 * ends and the engines carry no internal link equity, which is the cheapest traffic available here
 * and needs no new writing.
 *
 *   node scripts/link-audit.mjs              # report to stdout
 *   node scripts/link-audit.mjs --write      # rewrite docs/content-map.md
 *   node scripts/link-audit.mjs --min 2      # only proposals scoring >= 2 keyword hits
 *
 * Why a checklist and not a patch: a wrong internal link costs the reader a click and the page a
 * relevance signal, and no keyword score can tell that a post about *furnace venting* is not about
 * *mortgage recasting* just because both contain "cost". The script narrows 44 × 15 to a short list;
 * a human adds the link, in WordPress, where the pairing belongs.
 *
 * The engine list is imported from `registry.ts` rather than restated here. A second copy of the
 * keywords would drift from the engines the moment one is renamed — the exact class of bug
 * `vibeAssets.ts` documents. esbuild is used to load the TS module without a build step; it ships
 * with Vite, so it is already in `node_modules` and nowhere else in the pipeline.
 */
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/content-map.md');
const CMS = process.env.PUBLIC_WORDPRESS_API_BASE || 'https://cms.wellroost.com';

const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	if (i === -1) return fallback;
	const v = process.argv[i + 1];
	return v && !v.startsWith('--') ? v : true;
};
const minScore = Number(arg('min', 1)) || 1;
const write = arg('write', false) === true;

/**
 * Load a TS module without a build step: bundle it to memory with esbuild, import from a data URL.
 * Both the engine registry and the curated pairing map are imported this way, so neither has to be
 * restated in this script — a second copy would drift from the engines the moment one is renamed.
 */
async function loadTs(entry) {
	const result = await build({
		entryPoints: [join(ROOT, entry)],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		logLevel: 'silent'
	});
	const code = result.outputFiles[0].text;
	return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

async function engines() {
	const mod = await loadTs('src/lib/calculators/registry.ts');
	return mod.engineRegistry.map((e) => ({
		slug: e.toolSlug,
		title: e.title,
		keywords: e.keywords,
		takes: e.takes,
		category: e.asset.category,
		href: e.asset.href
	}));
}

async function posts() {
	const all = [];
	for (let page = 1; page <= 10; page += 1) {
		const res = await fetch(
			`${CMS}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug,title,content,link,date,vertical`
		);
		if (!res.ok) {
			const detail = (await res.text()).slice(0, 200);
			// Past the last page WordPress answers 400 `rest_post_invalid_page_number`; that is the
			// end of the list, not a fault. Any other non-OK is a real failure and must be loud.
			if (page > 1 && detail.includes('rest_post_invalid_page_number')) break;
			throw new Error(`CMS ${res.status} on page ${page}: ${detail}`);
		}
		const batch = await res.json();
		if (!Array.isArray(batch) || batch.length === 0) break;
		all.push(...batch);
	}
	return all;
}

const strip = (html) =>
	html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z]+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const [engineList, postList, curated] = await Promise.all([
	engines(),
	posts(),
	loadTs('src/data/article-tools.ts').then((m) => m.articleTools)
]);

/**
 * Terms that appear in most engines and therefore identify none of them. Full keyword *phrases*
 * ("recast vs refinance calculator") almost never appear verbatim in prose — the first run of this
 * script matched zero posts for that reason — so matching is on distinctive terms, not phrases.
 */
const GENERIC = new Set([
	'calculator', 'calculators', 'home', 'house', 'household', 'cost', 'costs', 'price', 'values',
	'your', 'there', 'with', 'from', 'that', 'this', 'what', 'when', 'does', 'have', 'into', 'over',
	'year', 'years', 'month', 'monthly', 'annual', 'rate', 'rates', 'loan', 'property', 'equity',
	// Common English that produces confident nonsense matches: a post about a heated door mat
	// "matched" rent-vs-buy on the word "rent" in an unrelated sentence.
	'even', 'move', 'moves', 'moving', 'sell', 'sells', 'selling', 'points', 'point', 'break',
	'breaks', 'should', 'file', 'test', 'time', 'times', 'work', 'works', 'report', 'reporting',
	'fund', 'funds', 'reserve', 'replacement', 'capital', 'schedule', 'upgrade', 'upgrades',
	'savings', 'payment', 'payments', 'purchase', 'purchasing', 'cancellation', 'variable',
	'remodel', 'remodeling', 'remodeling', 'improve', 'improvement', 'insurance', 'claim', 'claims'
]);

function termsOf(engine) {
	const words = [
		...engine.keywords.flatMap((k) => k.split(/[^a-z0-9%-]+/i)),
		...engine.title.split(/[^a-z0-9%-]+/i)
	]
		.map((w) => w.toLowerCase())
		.filter((w) => w.length >= 4 && !GENERIC.has(w));
	return [...new Set(words)];
}

// Document frequency of each term across engines: 1 means the term names one engine only.
const DF = new Map();
for (const engine of engineList) {
	for (const term of termsOf(engine)) DF.set(term, (DF.get(term) ?? 0) + 1);
}

const audit = postList.map((post) => {
	const title = strip(post.title.rendered);
	const body = strip(post.content.rendered);
	const haystack = `${title} ${body}`.toLowerCase();
	const headline = title.toLowerCase();
	const linksTo = [...post.content.rendered.matchAll(/href="([^"]*\/calculators\/[^"]*)"/gi)].map((m) => m[1]);

	const scored = engineList
		.map((engine) => {
			// Only terms that discriminate: a term carried by several engines ("escrow", "tariff")
			// cannot tell them apart, so it is not evidence for any of them.
			const hits = termsOf(engine).filter((t) => haystack.includes(t) && (DF.get(t) ?? 0) <= 2);
			// A term in the headline is worth three in the body: "deductible" in the title says what
			// the post is about; the same word in a paragraph says what it mentioned.
			const score = hits.reduce((sum, t) => sum + (headline.includes(t) ? 3 : 1), 0);
			const inTitle = hits.filter((t) => headline.includes(t));
			return { engine, hits, inTitle, score };
		})
		// One body-only hit is a coincidence, not a pairing. Require a headline hit or two hits.
		.filter((s) => s.score >= minScore && (s.inTitle.length > 0 || s.hits.length >= 2))
		.sort((a, b) => b.score - a.score);

	const paired = (curated[post.slug] ?? []).flatMap((entry) => {
		const engine = engineList.find((e) => e.slug === entry.tool);
		return engine ? [{ engine, note: entry.note }] : [];
	});

	return {
		slug: post.slug,
		// The URL this site serves, not the CMS permalink: a pair of links that disagree about where
		// a post lives is how a 404 gets reported as a live page.
		url: `https://wellroost.com/${post.slug}/`,
		/**
		 * A post with no `vertical` term is published in WordPress but belongs to no property, so
		 * this site never builds it and the URL 404s while the CMS serves it. Three of the four such
		 * posts are cluster content, which is why they are counted rather than quietly skipped.
		 */
		built: Array.isArray(post.vertical) && post.vertical.length > 0,
		title,
		words: body.split(' ').length,
		linksTo,
		scored,
		paired
	};
});

/** The rendered page links an engine when the curated map says so, with or without a body anchor. */
const covered = audit.filter((a) => a.paired.length > 0);
const uncovered = audit.filter((a) => a.paired.length === 0);
/** A contextual anchor inside the prose is stronger than the block; this is the gap to close. */
const proseMissing = covered.filter((a) => a.linksTo.length === 0);
const unmatched = audit.filter((a) => a.scored.length === 0);

const rows = (list) =>
	list
		.map((a) => {
			const best = a.scored.slice(0, 3);
			const proposal = best
				.map((s) => {
					const named = (s.inTitle.length ? s.inTitle : s.hits).slice(0, 4).join(', ');
					return `${s.engine.slug} (${s.score})${named ? ` — ${named}` : ''}`;
				})
				.join('<br>');
			return `| [${a.title}](${`${CMS.replace('cms.', '')}/articles/${a.slug}/`}) | ${a.words} | ${a.linksTo.length ? a.linksTo.join(', ') : '—'} | ${proposal || '—'} |`;
		})
		.join('\n');

const report = `# Content map — post ↔ engine

Generated by \`node scripts/link-audit.mjs --write\`. Do not hand-edit; rerun it.

The pairing itself lives in \`src/data/article-tools.ts\` and is rendered by \`src/pages/[slug].astro\` as
a block under the article body. This file is the audit of that map: what is covered, what is not, and
where a contextual anchor inside the prose would still be worth adding (a body link carries more
relevance than a block below it, and a human adds it in WordPress).

| Measure | Count |
|---|---:|
| Posts in WordPress | ${audit.length} |
| Posts built on this site (has a \`vertical\` term) | ${audit.filter((a) => a.built).length} |
| **Published but 404 on the site (no vertical term)** | **${audit.filter((a) => !a.built).length}** |
| Posts with a curated pairing | **${covered.length}** |
| Posts with a body anchor into a calculator | ${audit.filter((a) => a.linksTo.length > 0).length} |
| Curated pairings with no body anchor yet | ${proseMissing.length} |
| Posts with no pairing (decide: pair, or leave as article) | ${uncovered.length} |
| Engines with at least one post behind them | ${new Set(audit.flatMap((a) => a.paired.map((s) => s.engine.slug))).size} of ${engineList.length} |

## Published in WordPress, not built on this site

These have no vertical term assigned, so the build skips them and the live URL returns 404 while the CMS
serves them. Fix in WordPress by assigning the property's vertical — not in code: the rule that a
post with no vertical is not published on any property is deliberate.

| Post | Curated pairing | Keyword hint |
|---|---|---|
${(() => {
	const ghosts = audit.filter((a) => !a.built);
	return ghosts.length
		? ghosts
				.map(
					(a) =>
						`| [${a.title}](${a.url}) | ${a.paired.map((x) => x.engine.slug).join(', ') || '—'} | ${a.scored.slice(0, 1).map((s) => `${s.engine.slug} (${s.score})`).join('') || '—'} |`
				)
				.join('\n')
		: '| _none_ | | |';
})()}

## Curated, but no anchor in the prose yet

| Post | Words | Paired engine | Hint for the anchor |
|---|---:|---|---|
${proseMissing.length ? proseMissing.map((a) => `| [${a.title}](${a.url}) | ${a.words} | \`${a.paired.map((x) => x.engine.slug).join('\`, \`')}\` | ${a.paired[0].note} |`).join('\n') : '| _none_ | | | |'}

## No pairing yet

Keyword hints only. A hint is not a decision: the first run of this script matched zero posts on
phrase keywords, and the term-based version still proposed "property-tax-appeal" for a post about a
smart-home API because both contain "ratio". Read the piece before adding a link.

| Post | Words | Keyword hints |
|---|---:|---|
${uncovered.length ? uncovered.map((a) => `| [${a.title}](${a.url}) | ${a.words} | ${a.scored.slice(0, 2).map((s) => `${s.engine.slug} (${s.score})`).join('<br>') || '— no candidate —'} |`).join('\n') : '| _none_ | | |'}

## Engines with nothing behind them

${
	(() => {
		const named = new Set(audit.flatMap((a) => a.paired.map((x) => x.engine.slug)));
		const lonely = engineList.filter((e) => !named.has(e.slug));
		return lonely.length
			? lonely.map((e) => `- \`${e.slug}\` — ${e.title} (${e.category})`).join('\n')
			: '_Every engine is named by at least one post._';
	})()
}
`;

if (write) {
	writeFileSync(OUT, report);
	console.log(`wrote ${OUT}`);
	console.log(
		`${audit.length} posts · ${covered.length} curated · ${proseMissing.length} missing a prose anchor · ${uncovered.length} unpaired · ${unmatched.length} with no candidate at all`
	);
} else {
	process.stdout.write(report);
}
