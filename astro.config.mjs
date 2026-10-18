// @ts-check
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

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
