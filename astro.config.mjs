// @ts-check
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

const WORDPRESS_API_BASE = (process.env.PUBLIC_WORDPRESS_API_BASE ?? 'https://cms.wellroost.com').replace(/\/$/, '');

/**
 * Real `<lastmod>` values, sourced from WordPress.
 *
 * The previous hand-rolled sitemap stamped every URL with *today*, which is worse than emitting no
 * lastmod at all — Google discards `lastmod` from a source it cannot trust. Dates here come from
 * each post's own `modified` field, truncated to `YYYY-MM-DD` because WordPress returns site-local
 * time with no offset: a plain date is unambiguous, a guessed `Z` is not.
 *
 * A CMS outage must not break the build, so failure logs loudly and degrades to "no lastmod".
 */
/** @type {Promise<Map<string, string>> | null} */
let lastmodPromise = null;

async function fetchLastmodMap() {
	/** @type {Map<string, string>} */
	const map = new Map();
	const perPage = 100; // WordPress caps per_page at 100

	try {
		for (let page = 1; ; page += 1) {
			const url = new URL(`${WORDPRESS_API_BASE}/wp-json/wp/v2/posts`);
			url.searchParams.set('_fields', 'slug,modified,date');
			url.searchParams.set('per_page', String(perPage));
			url.searchParams.set('page', String(page));

			const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status} for ${url.pathname}`);
			}

			const batch = /** @type {Array<{ slug?: string, modified?: string, date?: string }>} */ (
				await response.json()
			);
			if (!Array.isArray(batch) || batch.length === 0) {
				break;
			}

			for (const post of batch) {
				const stamp = post.modified ?? post.date;
				if (post.slug && stamp) {
					map.set(`/${post.slug}/`, stamp.slice(0, 10));
				}
			}

			if (batch.length < perPage) {
				break;
			}
		}

		if (map.size === 0) {
			console.warn(
				`[sitemap] ${WORDPRESS_API_BASE} returned no post dates — emitting /sitemap.xml without <lastmod>.`
			);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(
			`[sitemap] could not read post dates from ${WORDPRESS_API_BASE} (${message}) — emitting /sitemap.xml without <lastmod>.`
		);
	}

	return map;
}

/**
 * Publishes the generated sitemap at the path crawlers actually probe.
 *
 * `@astrojs/sitemap` emits `sitemap-index.xml` + `sitemap-0.xml` only. Search Console, Bing and
 * every sitemap checker request `/sitemap.xml` verbatim, so the index is copied there. The URL
 * list itself lives ONLY in the generated chunk — there is no second hand-maintained copy to drift.
 *
 * Registered AFTER `sitemap()`: `astro:build:done` hooks run in integration order.
 */
function sitemapAlias() {
	return {
		name: 'site:sitemap-alias',
		hooks: {
			/** @param {{ dir: URL, logger: { info: (m: string) => void } }} ctx */
			'astro:build:done': async ({ dir, logger }) => {
				const out = fileURLToPath(dir);
				// Deliberately fatal: a build that fails loudly beats one that ships a 404 at
				// /sitemap.xml for a month.
				await copyFile(`${out}/sitemap-index.xml`, `${out}/sitemap.xml`);
				logger.info('published /sitemap.xml (copy of sitemap-index.xml)');
			}
		}
	};
}

// https://astro.build/config
export default defineConfig({
	site: process.env.PUBLIC_SITE_URL ?? 'https://wellroost.com',
	integrations: [
		react(),
		sitemap({
			// Never advertise a URL we do not want indexed. `/404` is the error page. Any legacy
			// redirect shim must stay out of the sitemap as well — a sitemap URL that answers
			// noindex/redirect is a contradiction crawlers penalise.
			filter: (page) => {
				const pathname = new URL(page).pathname;
				return pathname !== '/404' && pathname !== '/404/' && !pathname.startsWith('/tools/');
			},
			// Async `serialize` is supported by @astrojs/sitemap. The fetch is lazy and memoised, so
			// `astro dev` never touches the CMS for it and a build makes exactly one pass.
			serialize: async (item) => {
				lastmodPromise ??= fetchLastmodMap();
				const dates = await lastmodPromise;
				const lastmod = dates.get(new URL(item.url).pathname);
				return lastmod ? { ...item, lastmod } : item;
			}
		}),
		sitemapAlias()
	],
	vite: {
		plugins: [/** @type {any} */ (tailwindcss())],
		optimizeDeps: {
			include: ['react', 'react-dom', 'react-dom/client']
		}
	}
});
