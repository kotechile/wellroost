import type { APIRoute } from 'astro';
import { calculatorTools } from '../lib/calculators/metadata';
import { getTopLevelCategories } from '../lib/categories';
import { fetchAllPosts } from '../lib/wordpress';

const staticPaths = ['/', '/calculators/', '/categories/', '/about/'];

function urlEntry(site: URL, path: string, lastmod?: string) {
	const loc = new URL(path, site).toString();
	return `\t<url>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</url>`;
}

export const GET: APIRoute = async ({ site }) => {
	const baseUrl = site ?? new URL('https://wellroost.com');
	const [categories, posts] = await Promise.all([getTopLevelCategories(), fetchAllPosts()]);
	
	const today = new Date().toISOString().split('T')[0];
	const entries: string[] = [];

	// Static Pages
	for (const path of staticPaths) {
		entries.push(urlEntry(baseUrl, path, today));
	}

	// Calculators
	for (const tool of calculatorTools) {
		entries.push(urlEntry(baseUrl, tool.href, today));
	}

	// Categories
	for (const category of categories) {
		entries.push(urlEntry(baseUrl, `/categories/${category.slug}/`, today));
	}

	// Posts from CMS
	for (const post of posts) {
		const rawDate = post.modified || post.date || today;
		const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
		entries.push(urlEntry(baseUrl, `/${post.slug}/`, formattedDate));
	}

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries,
		'</urlset>'
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
};
