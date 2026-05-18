import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	const baseUrl = site ?? new URL('https://giniloh.com');
	const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();

	return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
};
