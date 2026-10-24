#!/usr/bin/env node
/**
 * Gate for CMS featured images — the machine-checked half of docs/cms-image-spec.md.
 *
 * The front end no longer generates images for new posts: whatever WordPress holds is what ships.
 * That makes the CMS the place a defect enters, and this is where it gets caught.
 *
 * Checks, per published post in this property's verticals:
 *   featured image set · 16:9 ±3% · ≥1600px wide · ≤400KB · 'large' rendition present ·
 *   alt text 40–140 chars and not the title · no two posts sharing an image
 *
 * Rules 11–20 (no baked text, no invented numbers, one physical subject, palette, key) cannot be
 * machine-checked; they are printed as a review reminder for every image that fails one of the
 * mechanical rules or is new to the baseline.
 *
 * Usage:
 *   node scripts/check-cms-images.mjs                  # gate (exit 1 on new violations)
 *   node scripts/check-cms-images.mjs --all            # list every post, pass or fail
 *   node scripts/check-cms-images.mjs --write-baseline # record the current set as grandfathered
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASELINE = path.join(ROOT, 'scripts/cms-image-baseline.json');

const API = (process.env.PUBLIC_WORDPRESS_API_BASE ?? 'https://cms.wellroost.com').replace(/\/$/, '');
const VERTICALS = (
	process.env.PUBLIC_WORDPRESS_VERTICALS ??
	'resilient_home_assets,home_equity_tco,home_infrastructure_lifecycle_tco,smart_home_telemetry,home_ops_execution,property_loss_insurance_mitigation'
)
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

const TARGET_ASPECT = 16 / 9;
const ASPECT_TOLERANCE = 0.03;
const MIN_WIDTH = 1600;
const MAX_BYTES = 400 * 1024;
const ALT_MIN = 40;
const ALT_MAX = 140;

const args = new Set(process.argv.slice(2));
const showAll = args.has('--all');
const writeBaseline = args.has('--write-baseline');

const strip = (html) =>
	(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim());

async function json(url) {
	const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
	return res.json();
}

async function resolveVerticalIds() {
	const terms = await json(`${API}/wp-json/wp/v2/vertical?per_page=100&_fields=id,slug`);
	const wanted = new Set(VERTICALS);
	return terms.filter((t) => wanted.has(t.slug)).map((t) => t.id);
}

function checkPost(post) {
	const media = (post._embedded?.['wp:featuredmedia'] ?? [])[0];
	const details = media?.media_details ?? {};
	const title = strip(post.title?.rendered);
	const alt = strip(media?.alt_text);
	const problems = [];

	if (!media?.source_url) {
		problems.push('no featured image');
	} else {
		const width = details.width ?? 0;
		const height = details.height ?? 0;
		const size = details.filesize ?? 0;
		const aspect = width && height ? width / height : 0;

		if (!width || !height) problems.push('missing dimensions');
		else {
			if (Math.abs(aspect - TARGET_ASPECT) / TARGET_ASPECT > ASPECT_TOLERANCE)
				problems.push(`aspect ${aspect.toFixed(2)}:1, needs 16:9`);
			if (width < MIN_WIDTH) problems.push(`${width}px wide, needs ≥${MIN_WIDTH}`);
		}
		if (size > MAX_BYTES) problems.push(`${Math.round(size / 1024)}KB, needs ≤${MAX_BYTES / 1024}KB`);
		if (!details.sizes?.large?.source_url) problems.push("no 'large' rendition (the front end would ship the original)");

		const file = media.source_url.split('/').pop() ?? '';
		if (/\s/.test(file)) problems.push('filename contains spaces');
		if (file !== file.toLowerCase()) problems.push('filename not lowercase');
	}

	// In-body images arrive in the same CMS payload and render through set:html, so they are CMS
	// images too — ungated until now.
	const body = String(post.content?.rendered ?? '');
	let bodyIndex = 0;
	for (const [, attrs] of body.matchAll(/<img\b([^>]*)>/gi)) {
		bodyIndex += 1;
		const bodyAlt = /\balt="([^"]*)"/i.exec(attrs) ?? /\balt='([^']*)'/i.exec(attrs);
		const bodySrc = /\bsrc="([^"]*)"/i.exec(attrs)?.[1] ?? '';
		if (!bodyAlt || !bodyAlt[1].trim()) problems.push(`body image ${bodyIndex}: no alt text`);
		if (bodySrc && !bodySrc.startsWith(API)) problems.push(`body image ${bodyIndex}: hosted off-site`);
	}

	if (!alt) problems.push('no alt text');
	else {
		if (alt.length < ALT_MIN) problems.push(`alt ${alt.length} chars, needs ≥${ALT_MIN}`);
		if (alt.length > ALT_MAX) problems.push(`alt ${alt.length} chars, needs ≤${ALT_MAX}`);
		if (title && alt.toLowerCase() === title.toLowerCase()) problems.push('alt repeats the post title');
	}

	return { slug: post.slug, title, image: media?.source_url ?? null, alt, problems };
}

const verticalIds = await resolveVerticalIds();
if (verticalIds.length === 0) {
	console.error('[images] could not resolve this property\'s vertical terms — refusing to report a pass.');
	process.exit(2);
}

const posts = await json(
	`${API}/wp-json/wp/v2/posts?per_page=100&_embed=1&vertical=${verticalIds.join(',')}`
);

const results = posts.map(checkPost);

// Two posts sharing an image is a templating tell as much as a duplicate.
const byImage = new Map();
for (const r of results) {
	if (!r.image) continue;
	byImage.set(r.image, [...(byImage.get(r.image) ?? []), r.slug]);
}
for (const [image, slugs] of byImage) {
	if (slugs.length > 1) {
		for (const r of results) {
			if (r.image === image) r.problems.push(`image shared with ${slugs.length - 1} other post(s)`);
		}
	}
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { posts: {} };
const known = (slug) => Object.hasOwn(baseline.posts ?? {}, slug);

if (writeBaseline) {
	const next = {
		updated: new Date().toISOString().slice(0, 10),
		note: 'Grandfathered featured images, published before docs/cms-image-spec.md. Reported, not fatal. New posts must pass.',
		posts: Object.fromEntries(
			results
				.filter((r) => r.problems.length > 0)
				.sort((a, b) => (a.slug < b.slug ? -1 : 1))
				.map((r) => [r.slug, r.problems])
		)
	};
	writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
	console.log(`[images] baseline written: ${Object.keys(next.posts).length} grandfathered post(s) → ${path.relative(ROOT, BASELINE)}`);
	process.exit(0);
}

let failures = 0;
let grandfathered = 0;

for (const r of results) {
	const isKnown = known(r.slug);
	if (r.problems.length === 0) {
		if (showAll) console.log(`  ok    ${r.slug}`);
		continue;
	}
	if (isKnown) grandfathered += 1;
	else failures += 1;

	if (showAll || !isKnown) {
		console.log(`  ${isKnown ? 'known' : 'FAIL '} ${r.slug}`);
		for (const p of r.problems) console.log(`        · ${p}`);
	}
}

const reviewed = results.length - failures - grandfathered;
console.log(
	`\n[images] ${results.length} post(s) · ${reviewed} pass · ${grandfathered} grandfathered · ${failures} new violation(s)`
);

if (failures > 0) {
	console.log(`
Fix against docs/cms-image-spec.md:
  · 16:9, 2400×1350, JPEG sRGB q84, ≤400KB, 'large' rendition present
  · alt text 40–140 characters describing the photograph, never the headline
And check by eye, which no script can do:
  · no text baked into the image, no invented numbers, one physical subject,
    no faces or logos, bone/graphite/pine palette, mid-key light
`);
	process.exit(1);
}

if (grandfathered > 0) {
	console.log('[images] grandfathered images reported above are pre-spec; run with --all to see them.');
}
