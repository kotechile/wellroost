import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	// No hardcoded fallback: a robots.txt naming the wrong origin looks correct in every manual
	// check, which is worse than a build that refuses to proceed.
	if (!site) {
		throw new Error('robots.txt needs `site` (or PUBLIC_SITE_URL) set in astro.config.mjs');
	}

	const body = [
		'User-agent: *',
		'Allow: /',
		'',
		// The conventional path every crawler probes. `sitemap-index.xml` also resolves, but
		// declaring the alias keeps robots, sitemap and canonical tags on one origin + one URL.
		`Sitemap: ${site.origin}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
};
