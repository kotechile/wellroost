#!/usr/bin/env node
/**
 * Assert the site's crawl entry points. Zero dependencies, runs anywhere node does.
 *
 *     node scripts/check-crawl-artifacts.mjs https://wellroost.com
 *     node scripts/check-crawl-artifacts.mjs http://localhost:8080
 *
 * Exit 0 = robots.txt answers and every Sitemap: line it declares resolves, /sitemap.xml answers
 * with URLs (and every chunk of an index answers), no advertised URL returns a redirect or a
 * noindex, article + tool URLs are present, unknown URLs return a real 404, and the homepage
 * canonical points at this property.
 *
 * Run it against the local nginx container BEFORE production — a generic static file server
 * answers 200 for meta-refresh redirect pages and for any unknown path, which produces false
 * results in both directions.
 */
import { ANALYTICS } from '../src/data/analytics.mjs';

const INPUT = process.argv[2];
if (!INPUT) {
	console.error('usage: node check-crawl-artifacts.mjs <origin>');
	process.exit(2);
}

const ORIGIN = new URL(INPUT).origin;
const HOST = new URL(INPUT).hostname;
const IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(HOST);
const TIMEOUT_MS = 15000;

let passed = 0;
const failures = [];

const ok = (label, detail = '') => {
	passed++;
	console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
};
const fail = (label, expected, actual) => {
	failures.push(`${label}: expected ${expected}, got ${actual}`);
	console.log(`  FAIL  ${label}\n        expected: ${expected}\n        actual:   ${actual}`);
};

async function probe(path) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(`${ORIGIN}${path}`, { signal: controller.signal, redirect: 'manual' });
		return { status: res.status, location: res.headers.get('location'), body: res.status === 200 ? await res.text() : '' };
	} catch (error) {
		return { status: 0, location: null, body: '', error: String(error) };
	} finally {
		clearTimeout(timer);
	}
}

/** The path a declared absolute URL names, so it can be resolved against the host under test. */
const toPath = (url) => url.replace(/^https?:\/\/[^/]+/, '') || '/';

const SITEMAP_URL = { locs: [] };

async function checkRobots() {
	console.log('\nrobots.txt');
	const robots = await probe('/robots.txt');
	if (robots.status !== 200) {
		fail('/robots.txt', '200', robots.status || robots.error);
		return;
	}
	ok('/robots.txt', '200');

	const declared = [...robots.body.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map((m) => m[1]);
	if (declared.length === 0) {
		fail('/robots.txt Sitemap line', 'at least one "Sitemap: <url>"', 'none found');
		return;
	}
	for (const url of declared) {
		const path = toPath(url);
		const r = await probe(path);
		if (r.status === 200) ok(`robots.txt declares ${path}`);
		else fail(`robots.txt declares ${path}`, '200', r.status || r.error);
	}
}

async function checkSitemap() {
	console.log('\n/sitemap.xml');
	const sm = await probe('/sitemap.xml');
	if (sm.status !== 200) {
		fail('/sitemap.xml', '200', sm.status || sm.error);
		return;
	}

	const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	if (locs.length === 0) {
		fail('/sitemap.xml contents', 'a <sitemapindex> or <urlset> with <loc> entries', 'zero <loc>');
		return;
	}

	if (!/<sitemapindex/.test(sm.body)) {
		const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		if (urls.length === 0) fail('/sitemap.xml <url> count', 'at least one <url>', '0');
		else ok('/sitemap.xml', `${urls.length} urls`);
		SITEMAP_URL.locs = urls;
		return;
	}

	ok('/sitemap.xml', `${locs.length} chunk(s)`);
	let total = 0;
	for (const loc of locs) {
		const path = toPath(loc);
		const r = await probe(path);
		if (r.status !== 200) {
			fail(`sitemap chunk ${path}`, '200', r.status || r.error);
			continue;
		}
		const urls = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		total += urls.length;
		SITEMAP_URL.locs.push(...urls);
		ok(`sitemap chunk ${path}`, '200');
	}
	if (total === 0) fail('sitemap chunk URLs', 'at least one <url>', '0 across all chunks');
	else ok('sitemap URL total', `${total} urls`);
}

/** Every advertised URL must answer 200 and must not be noindex — a contradiction otherwise. */
async function checkSitemapTargets() {
	if (SITEMAP_URL.locs.length === 0) {
		return;
	}
	console.log('\nsitemap targets');

	const paths = [...new Set(SITEMAP_URL.locs.map(toPath))];
	const sample = paths.length > 40 ? paths.slice(0, 40) : paths;
	let broken = 0;
	let noindexed = 0;

	for (const path of sample) {
		const r = await probe(path);
		if (r.status !== 200) {
			broken++;
			fail(`sitemap url ${path}`, '200', r.status || r.error);
			continue;
		}
		if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(r.body)) {
			noindexed++;
			fail(`sitemap url ${path}`, 'indexable', 'noindex meta tag');
		}
	}
	if (broken === 0 && noindexed === 0) {
		ok(`all ${sample.length} sampled sitemap URLs`, '200 + indexable');
	}

	const hasArticle = paths.some((p) => !/^\/(calculators|categories|about)\/?$/.test(p) && p.split('/').filter(Boolean).length === 1);
	if (hasArticle) ok('sitemap contains article URLs');
	else fail('sitemap article coverage', 'at least one single-segment post URL', 'none');

	const toolCount = paths.filter((p) => p.startsWith('/calculators/') && p !== '/calculators/').length;
	if (toolCount > 0) ok('sitemap contains calculator URLs', `${toolCount}`);
	else fail('sitemap calculator coverage', 'at least one /calculators/<slug>/', 'none');

	const legacy = paths.filter((p) => p.startsWith('/tools/'));
	if (legacy.length === 0) ok('no legacy /tools/ URLs in sitemap');
	else fail('sitemap legacy URLs', 'none', legacy.join(', '));
}

async function check404() {
	console.log('\n404 handling');
	const r = await probe(`/crawl-check-does-not-exist-${Date.now()}/`);
	if (r.status === 404) ok('unknown URL', '404');
	else fail('unknown URL', '404 (not a 200 homepage)', r.status || r.error);
}

async function checkCanonical() {
	console.log('\ncanonical host');
	const home = await probe('/');
	const match = home.body.match(/rel="canonical" href="([^"]+)"/);
	if (!match) {
		fail('canonical tag on /', 'a rel="canonical" link', 'not found');
		return;
	}
	const canonical = match[1];
	let canonicalHost;
	try {
		canonicalHost = new URL(canonical).hostname;
	} catch {
		fail('canonical is a valid URL', 'https://…', canonical);
		return;
	}
	// The canonical is baked at build time, so a local or staging origin legitimately serves the
	// production host. Only a genuinely different domain is a failure — and "report RED on every
	// local run" is how a gate teaches people to ignore its output.
	const sameRegistrable =
		canonicalHost === HOST || canonicalHost.endsWith(`.${HOST}`) || HOST.endsWith(`.${canonicalHost}`);
	if (sameRegistrable || IS_LOCAL) ok(`canonical = ${canonical}`);
	else fail('canonical host', `${HOST} (this property)`, canonical);
}

/**
 * A property with no analytics cannot report "no traffic" — it reports no data, and every fix after
 * that is unverifiable. This checks the served HTML, not the repo, because the tag is gated on a
 * BUILD-time variable: the source can be perfect while the deployed bundle records nothing.
 *
 * Same for og:image: `content="…/favicon.svg"` is not a valid preview for any consumer, so every
 * share renders as an empty box and the distribution step has nothing to work with.
 */
async function checkInstrumentation() {
	console.log('\nmeasurement and share card');
	const home = await probe('/');

	const id = home.body.match(/data-website-id="([^"]*)"/)?.[1];
	if (!id) {
		fail('analytics tag on /', 'a script with data-website-id', 'none in the served HTML — this property is unmeasured');
		return;
	}
	// The exact id, not merely an id: a copy-pasted sibling's id records visits against the wrong
	// property and looks completely healthy from here.
	if (id === ANALYTICS.websiteId) ok('analytics tag on /', id);
	else fail('analytics website id', `${ANALYTICS.websiteId} (wellroost.com)`, `${id} — wrong property or a stale build`);

	const src = home.body.match(/src="([^"]*)"[^>]*data-website-id/)?.[1] || '';
	if (src && new URL(src).host === new URL(ANALYTICS.src).host) ok('tracker is the self-hosted Umami', src);
	else fail('tracker host', new URL(ANALYTICS.src).host, src || '(not detected)');

	const domains = home.body.match(/data-domains="([^"]*)"/)?.[1] || '';
	if (domains.split(',').map((d) => d.trim()).includes(HOST)) ok('analytics scoped to this host', domains);
	else fail('analytics data-domains', `a list including ${HOST}`, domains || '(none)');

	const ogImage = home.body.match(/property="og:image" content="([^"]+)"/)?.[1] || '';
	if (!ogImage) fail('og:image on /', 'an absolute image URL', 'not found');
	else if (/\.(png|jpe?g|webp|avif)$/i.test(ogImage)) ok('og:image is a raster card', ogImage);
	else fail('og:image format', 'png/jpg/webp — consumers cannot render an svg card', ogImage);
}

console.log(`\nChecking crawl artifacts at ${ORIGIN}`);
await checkRobots();
await checkSitemap();
await checkSitemapTargets();
await check404();
await checkCanonical();
await checkInstrumentation();

console.log(`\n${'-'.repeat(58)}`);
if (failures.length === 0) {
	console.log(`GREEN — ${passed} checks passed`);
	process.exit(0);
}
console.log(`RED — ${passed} passed, ${failures.length} FAILED`);
for (const f of failures) console.log(`  · ${f}`);
process.exit(1);
