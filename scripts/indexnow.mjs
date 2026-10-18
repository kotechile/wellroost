#!/usr/bin/env node
/**
 * Submit new and edited articles to Bing / Yandex via IndexNow.
 *
 *     node scripts/indexnow.mjs                  # posts modified in the last 2 days
 *     node scripts/indexnow.mjs --since 7        # wider window (e.g. after a missed run)
 *     node scripts/indexnow.mjs --all            # every published post
 *     node scripts/indexnow.mjs --dry-run        # print the payload, submit nothing
 *
 * IndexNow is the fast path for Bing: without it a new article waits for the next crawl of
 * /sitemap.xml (hours to days). With it, Bing fetches within minutes.
 *
 * The URL set comes from WordPress `modified_after`, not from a local build, so this can run on a
 * schedule from anywhere with network access — no dist/, no state file, no diffing.
 *
 * Run it AFTER the deploy is live. Submitting a URL that still 404s teaches IndexNow the signal is
 * unreliable; the key-file check below fails loudly rather than letting that happen silently.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * IndexNow key. Public by design — it is served from the site root to prove URL ownership.
 * Must match the name and contents of `public/<KEY>.txt`.
 */
const KEY = '2f7c9b1e4d6a83f05c2e7b9d41a6f3c8';
const KEY_FILE = `${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function readDotEnv() {
	const path = join(REPO_ROOT, '.env');
	if (!existsSync(path)) {
		return {};
	}
	/** @type {Record<string, string>} */
	const parsed = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
			continue;
		}
		const index = trimmed.indexOf('=');
		parsed[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
	}
	return parsed;
}

const dotenv = readDotEnv();
const SITE = (process.env.PUBLIC_SITE_URL ?? dotenv.PUBLIC_SITE_URL ?? 'https://wellroost.com').replace(/\/$/, '');
const WP_BASE = (
	process.env.PUBLIC_WORDPRESS_API_BASE ??
	dotenv.PUBLIC_WORDPRESS_API_BASE ??
	'https://cms.wellroost.com'
).replace(/\/$/, '');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const sinceIndex = args.indexOf('--since');
const sinceDays = sinceIndex >= 0 ? Number(args[sinceIndex + 1]) : 2;

if (sinceIndex >= 0 && !Number.isFinite(sinceDays)) {
	console.error('--since needs a number of days, e.g. --since 3');
	process.exit(2);
}

const host = new URL(SITE).hostname;

/** @param {number} days */
function isoDaysAgo(days) {
	const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	return date.toISOString().slice(0, 19);
}

async function fetchPostUrls() {
	const url = new URL(`${WP_BASE}/wp-json/wp/v2/posts`);
	url.searchParams.set('per_page', '100');
	url.searchParams.set('_fields', 'slug,modified');
	url.searchParams.set('orderby', 'modified');
	url.searchParams.set('order', 'desc');
	if (!all) {
		url.searchParams.set('modified_after', isoDaysAgo(sinceDays));
	}

	const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
	if (!response.ok) {
		throw new Error(`WordPress returned HTTP ${response.status} for ${url.pathname}`);
	}

	/** @type {Array<{ slug?: string }>} */
	const posts = await response.json();
	return posts
		.map((post) => post.slug)
		.filter((slug) => typeof slug === 'string' && slug.length > 0)
		.map((slug) => `${SITE}/${slug}/`);
}

/**
 * IndexNow rejects a submission whose key file does not match, but it does so after the URLs are
 * thrown away. Check first so the failure names the actual problem.
 */
async function assertKeyFile() {
	const keyLocation = `${SITE}/${KEY_FILE}`;
	const response = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) }).catch((error) => {
		throw new Error(`cannot reach ${keyLocation}: ${error.message}`);
	});

	if (response.status !== 200) {
		throw new Error(`${keyLocation} returned HTTP ${response.status} — deploy the key file at the site root first`);
	}

	const body = (await response.text()).trim();
	if (body !== KEY) {
		throw new Error(`${keyLocation} does not contain the IndexNow key (served ${JSON.stringify(body.slice(0, 40))})`);
	}

	return keyLocation;
}

async function main() {
	console.log(`IndexNow → ${host}  (window: ${all ? 'all posts' : `modified in last ${sinceDays}d`})`);

	const urls = await fetchPostUrls();
	if (urls.length === 0) {
		console.log('No posts in the window — nothing to submit.');
		return 0;
	}

	console.log(`${urls.length} URL(s) in scope:`);
	for (const url of urls) {
		console.log(`  · ${url}`);
	}

	const keyLocation = await assertKeyFile();
	console.log(`Key verified at ${keyLocation}`);

	const payload = { host, key: KEY, keyLocation, urlList: urls };

	if (dryRun) {
		console.log('\n--dry-run: nothing submitted.');
		return 0;
	}

	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(20000)
	});

	const body = await response.text();
	console.log(`\nIndexNow responded ${response.status}${body ? `: ${body.slice(0, 400)}` : ''}`);

	// 200 = accepted, 202 = accepted but key validation pending. Anything else is a real failure.
	if (response.status === 200 || response.status === 202) {
		return 0;
	}

	const hints = {
		400: 'malformed request',
		403: 'key not valid — the key file and KEY constant disagree',
		422: 'URLs do not belong to the host, or the key does not match',
		429: 'too many requests — back off and retry later'
	};
	console.error(`FAILED: ${hints[response.status] ?? 'unexpected status'}`);
	return 1;
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`FAILED: ${error.message}`);
		process.exit(1);
	});
