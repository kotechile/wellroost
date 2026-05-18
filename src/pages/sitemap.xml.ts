import type { APIRoute } from 'astro';
import { calculatorTools } from '../lib/calculators/metadata';
import { getTopLevelCategories } from '../lib/categories';
import { fetchAllPosts } from '../lib/wordpress';

const staticPaths = ['/', '/calculators/', '/categories/', '/about/'];

function urlEntry(site: URL, path: string) {
	const loc = new URL(path, site).toString();
	return `\t<url><loc>${loc}</loc></url>`;
}

export const GET: APIRoute = async ({ site }) => {
	const baseUrl = site ?? new URL('https://giniloh.com');
	const [categories, posts] = await Promise.all([getTopLevelCategories(), fetchAllPosts()]);
	const paths = new Set([
		...staticPaths,
		...calculatorTools.map((tool) => tool.href),
		...categories.map((category) => `/categories/${category.slug}/`),
		...posts.map((post) => `/${post.slug}/`)
	]);

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...Array.from(paths).map((path) => urlEntry(baseUrl, path)),
		'</urlset>'
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
};
