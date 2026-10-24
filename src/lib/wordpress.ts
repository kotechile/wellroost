interface WordPressRenderedField {
	rendered?: string;
}

interface WordPressMedia {
	source_url?: string;
	alt_text?: string;
	media_details?: {
		width?: number;
		height?: number;
		sizes?: Record<string, { source_url?: string; width?: number; height?: number }>;
	};
}

/**
 * WordPress publishes every upload at several renditions. Taking `source_url` means shipping the
 * largest (here: 2,560px, 342 KB on average) inside a card that renders at 340px. Prefer `large`,
 * fall back to `medium_large`, and only then the original.
 */
function pickMediaUrl(media?: WordPressMedia): string | null {
	if (!media) return null;
	const sizes = media.media_details?.sizes ?? {};
	for (const key of ['large', 'medium_large', 'medium']) {
		const url = sizes[key]?.source_url;
		if (url) return url;
	}
	return media.source_url ?? null;
}

interface WordPressTerm {
	id?: number;
	name?: string;
	slug?: string;
}

interface WordPressPostResponse {
	id: number;
	link?: string;
	date?: string;
	modified?: string;
	title?: WordPressRenderedField;
	excerpt?: WordPressRenderedField;
	content?: WordPressRenderedField;
	slug?: string;
	_embedded?: {
		'wp:featuredmedia'?: WordPressMedia[];
		'wp:term'?: WordPressTerm[][];
	};
}

interface WordPressCategoryResponse {
	id: number;
	count?: number;
	description?: string;
	name?: string;
	slug?: string;
	parent?: number;
}

export interface WordPressPost {
	id: number;
	title: string;
	excerpt: string;
	content: string;
	slug: string;
	link: string;
	date: string | null;
	modified: string | null;
	featuredImage: string | null;
	featuredImageAlt: string;
	categoryLabel: string | null;
	categorySlug: string | null;
}

export interface WordPressCategory {
	id: number;
	name: string;
	slug: string;
	description: string;
	parent: number | null;
	count: number;
}

const HTML_ENTITY_MAP: Record<string, string> = {
	'&amp;': '&',
	'&quot;': '"',
	'&lt;': '<',
	'&gt;': '>',
	'&apos;': "'",
	'&#039;': "'",
	'&#8217;': "'",
	'&#8211;': '–',
	'&#8220;': '"',
	'&#8221;': '"',
	'&#8230;': '…',
	'&nbsp;': ' '
};

function getWordPressApiBase() {
	const baseUrl =
		import.meta.env.PUBLIC_WORDPRESS_API_BASE ?? import.meta.env.WORDPRESS_API_BASE ?? 'https://cms.wellroost.com';
	return baseUrl.replace(/\/$/, '');
}

export function decodeHtmlEntities(value: string) {
	if (!value) return '';
	return value.replace(/&[#a-zA-Z0-9]+;/g, (entity) => {
		if (entity in HTML_ENTITY_MAP) {
			return HTML_ENTITY_MAP[entity];
		}
		if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
			const num = parseInt(entity.slice(3, -1), 16);
			return !isNaN(num) ? String.fromCharCode(num) : entity;
		}
		if (entity.startsWith('&#')) {
			const num = parseInt(entity.slice(2, -1), 10);
			return !isNaN(num) ? String.fromCharCode(num) : entity;
		}
		return entity;
	});
}

function stripHtml(value: string | undefined) {
	if (!value) {
		return '';
	}

	return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizePost(post: WordPressPostResponse): WordPressPost {
	const terms = post._embedded?.['wp:term']?.flat() ?? [];
	const category = terms.find((term) => term?.slug && term?.name);
	const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
	
	let featuredImage = pickMediaUrl(featuredMedia);
	const apiBase = getWordPressApiBase();

	// Ensure featured image URL is absolute if it starts with /
	if (featuredImage && featuredImage.startsWith('/') && apiBase) {
		featuredImage = `${apiBase}${featuredImage}`;
	}

	let htmlContent = post.content?.rendered || '';
	
	// Remove redundant WordPress article wrapper fragments if present
	htmlContent = htmlContent
		.replace(/<div class="article-context"[^>]*>[\s\S]*?<\/div>\s*<\/div>/ig, '');

	// Clean up wpautop formatting inside LaTeX blocks so KaTeX doesn't choke on <br> tags
	htmlContent = htmlContent.replace(/(\$\$|\\\[)([\s\S]*?)(\$\$|\\\])/g, (_match, open, content, close) => {
		let cleanContent = content
			.replace(/<[^>]+>/g, '') 
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');
		return `${open}${cleanContent}${close}`;
	});

	// Convert markdown bolding pairs and stray orphan markdown colons (e.g., "Built after 2010:**") into proper HTML <strong>
	htmlContent = htmlContent
		.replace(/\*\*([^*<]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|>|\s)([A-Z0-9][^<:\n]{1,60}):\*\*/g, '$1<strong>$2:</strong>')
		.replace(/\*\*/g, '');

	// Remove duplicate identical adjacent <li> items injected by optimizer tools
	htmlContent = htmlContent.replace(/(<li[^>]*>[\s\S]*?<\/li>)\s*(<li[^>]*>[\s\S]*?<\/li>)/gi, (match, li1, li2) => {
		const text1 = stripHtml(li1).toLowerCase();
		const text2 = stripHtml(li2).toLowerCase();
		if (text1 && text1 === text2) {
			return li1;
		}
		return match;
	});

	// 1. Strip <p>, </p>, and <br> tags injected INSIDE <svg> blocks by wpautop
	htmlContent = htmlContent.replace(/<svg([\s\S]*?)<\/svg>/gi, (_match, inner) => {
		const cleanInner = inner
			.replace(/<\/?p[^>]*>/gi, '')
			.replace(/<br\s*\/?>/gi, '');
		return `<svg${cleanInner}</svg>`;
	});

	// 2. Unwrap any <svg> accidentally wrapped inside an outer <p>...</p>
	htmlContent = htmlContent.replace(/<p>\s*(<svg[\s\S]*?<\/svg>)\s*<\/p>/gi, '$1');

	// 3. Remove any empty leftover <p></p> tags
	htmlContent = htmlContent.replace(/<p>\s*<\/p>/gi, '');

	// 4. Ensure relative media paths starting with /wp-content/ point to WordPress API host
	if (apiBase) {
		htmlContent = htmlContent.replace(/src=(["'])\/wp-content\//gi, `src=$1${apiBase}/wp-content/`);
	}

	return {
		id: post.id,
		title: stripHtml(post.title?.rendered) || 'Untitled post',
		excerpt: stripHtml(post.excerpt?.rendered),
		content: htmlContent,
		slug: post.slug || '',
		link: post.link ?? '#',
		date: post.date ?? null,
		modified: post.modified ?? post.date ?? null,
		featuredImage,
		featuredImageAlt: featuredMedia?.alt_text || '',
		// The embedded term name is still HTML-encoded ("Energy &amp; Efficiency"), and it is
		// printed as text on every card. Decode it here, once, where the post is normalized.
		categoryLabel: category?.name ? decodeHtmlEntities(category.name) : null,
		categorySlug: category?.slug ?? null
	};
}

async function fetchWordPress(endpoint: string, query: Record<string, string | number | undefined>) {
	const baseUrl = getWordPressApiBase();
	if (!baseUrl) {
		return [];
	}

	const url = new URL(`${baseUrl}/wp-json/wp/v2/${endpoint}`);
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === '') continue;
		// WordPress rejects per_page > 100 with a 400, which reads as "no content" downstream.
		url.searchParams.set(key, key === 'per_page' ? String(Math.min(Number(value) || 1, 100)) : String(value));
	}

	// Add a cache-buster parameter to prevent CDN/Edge nodes from serving stale JSON
	url.searchParams.set('_t', Date.now().toString());

	try {
		const response = await fetch(url, {
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache'
			},
			cache: 'no-store',
			signal: AbortSignal.timeout(8000)
		});
		if (!response.ok) {
			// A 400 from a malformed taxonomy param used to be indistinguishable from "no content":
			// the build stayed green and the site shipped empty. Say what the API said.
			const detail = await response.text().catch(() => '');
			console.error(
				`[wordpress] ${response.status} ${response.statusText} from ${url.pathname}${url.search} — ${detail.slice(0, 300)}`
			);
			return [];
		}

		const data = (await response.json()) as WordPressPostResponse[];
		return data;
	} catch (error) {
		console.error(`Failed to fetch WordPress data from ${url.toString()}`, error);
		return [];
	}
}

function normalizeCategory(category: WordPressCategoryResponse): WordPressCategory {
	return {
		id: category.id,
		name: stripHtml(category.name) || 'Untitled category',
		slug: category.slug?.trim() || `category-${category.id}`,
		description: stripHtml(category.description),
		parent: category.parent && category.parent > 0 ? category.parent : null,
		count: category.count ?? 0
	};
}

/**
 * WordPress sends article bodies with the theme's own markup: Tailwind classes that mean something
 * else here (`border-border` resolves to currentColor — a near-black hairline on a paper ground),
 * inline float/width chrome, no `loading`, and often no dimensions. Normalise image tags in the
 * shared utility so every page renders the same thing; leave the rest of the body alone, because
 * tables and embeds should not be rewritten by guesswork.
 */
export function cleanArticleHtml(html: string): string {
	return String(html ?? '').replace(/<img\b([^>]*)>/gi, (_tag, attrs: string) => {
		const src = /\bsrc="([^"]*)"/i.exec(attrs)?.[1];
		if (!src) return '';
		const alt = /\balt="([^"]*)"/i.exec(attrs)?.[1] ?? '';
		const width = /\bwidth="(\d+)"/i.exec(attrs)?.[1];
		const height = /\bheight="(\d+)"/i.exec(attrs)?.[1];
		const dims = width && height ? ` width="${width}" height="${height}"` : '';
		return `<img src="${src}" alt="${alt}"${dims} loading="lazy" decoding="async" data-inline-image="true">`;
	});
}

export function hasWordPressApiBase() {
	return Boolean(getWordPressApiBase());
}

export function getConfiguredWordPressApiBase() {
	return getWordPressApiBase();
}

/**
 * The vertical terms that make a post belong to THIS property.
 *
 * One WordPress install publishes one property here: cms.wellroost.com carries six home verticals
 * (equity, infrastructure, operations, insurance, resilience, smart home) and nothing else. A post
 * with none of them is held as a draft by the routing job, so anything published is ours — the list
 * still exists because it is the contract, and because it keeps a stray cross-post out.
 *
 * Two things learned the hard way, both fixed here:
 * - the `vertical` REST param on this install takes TERM IDS, not slugs. Sending slugs returns
 *   HTTP 400, and a 400 used to look exactly like "no articles" (see the logging in fetchWordPress).
 * - this property owns six verticals, not one. Filtering to a single slug hid 30 of the 38 articles.
 *
 * Override with PUBLIC_WORDPRESS_VERTICALS (comma-separated slugs) if the terms change.
 */
const DEFAULT_VERTICAL_SLUGS = [
	'resilient_home_assets',
	'home_equity_tco',
	'home_infrastructure_lifecycle_tco',
	'smart_home_telemetry',
	'home_ops_execution',
	'property_loss_insurance_mitigation',
	// Routed to wellroost.com by public.vertical_sites but missing from this list, so their posts
	// were filtered out of every build and 404'd on the reader front. yard_robotics added with its
	// first article (2026-10-24). home_diagnostics_tech and outdoor_power_equipment are still absent
	// and have no published posts yet — see the report, this list should be derived, not hand-kept.
	'yard_robotics'
];

export function getConfiguredVerticalSlugs(): string[] {
	const raw = import.meta.env.PUBLIC_WORDPRESS_VERTICALS ?? import.meta.env.WORDPRESS_VERTICALS;
	const configured = String(raw ?? '')
		.split(',')
		.map((slug) => slug.trim())
		.filter(Boolean);
	return configured.length > 0 ? configured : DEFAULT_VERTICAL_SLUGS;
}

let verticalIdsPromise: Promise<number[]> | undefined;

/** Map this property's vertical slugs onto the term ids the REST API actually accepts. */
async function resolveVerticalIds(): Promise<number[]> {
	verticalIdsPromise ??= (async () => {
		const slugs = new Set(getConfiguredVerticalSlugs());
		const rows = (await fetchWordPress('vertical', {
			per_page: 100,
			_fields: 'id,slug'
		})) as unknown as Array<{ id: number; slug: string }>;

		if (!Array.isArray(rows)) {
			return [];
		}
		return rows.filter((term) => slugs.has(term.slug)).map((term) => term.id);
	})();

	return verticalIdsPromise;
}

/**
 * The `vertical` value to send, or undefined when it cannot be resolved.
 *
 * Undefined means "do not filter" rather than "filter to nothing": a taxonomy hiccup should leave
 * the site readable, and an empty site is the failure this file exists to prevent.
 */
export async function getVerticalParam(): Promise<string | undefined> {
	const ids = await resolveVerticalIds();
	return ids.length > 0 ? ids.join(',') : undefined;
}

/** Query fragment carrying this property's vertical filter. */
async function withVertical(query: Record<string, string | number | undefined>) {
	const vertical = await getVerticalParam();
	return vertical ? { ...query, vertical } : query;
}

/** Category ids — and how many of this property's published posts — use them. */
export async function fetchVerticalCategoryCounts(limit = 100): Promise<Map<number, number>> {
	const rows = (await fetchWordPress(
		'posts',
		await withVertical({ per_page: limit, _fields: 'id,categories' })
	)) as unknown as Array<{ id: number; categories?: number[] }>;

	const counts = new Map<number, number>();
	if (!Array.isArray(rows)) {
		return counts;
	}
	for (const row of rows) {
		for (const id of row.categories ?? []) {
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
	}
	return counts;
}

export async function fetchLatestPosts(limit = 6) {
	const posts = await fetchWordPress(
		'posts',
		await withVertical({ _embed: 1, per_page: limit })
	);
	return posts.map(normalizePost);
}

export async function fetchPostsByCategory(categoryId: number, limit = 12) {
	const posts = await fetchWordPress(
		'posts',
		await withVertical({ _embed: 1, categories: categoryId, per_page: limit })
	);
	return posts.map(normalizePost);
}

export async function searchPosts(query: string, limit = 8) {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return [];
	}

	const posts = await fetchWordPress(
		'posts',
		await withVertical({ _embed: 1, search: trimmedQuery, per_page: limit })
	);
	return posts.map(normalizePost);
}

export async function fetchPostBySlug(slug: string) {
	const posts = await fetchWordPress('posts', {
		_embed: 1,
		slug: slug
	});
	
	if (posts.length === 0) {
		return null;
	}
	
	return normalizePost(posts[0]);
}

export async function fetchAllPosts(limit = 100) {
	const perPage = 100; // WordPress caps per_page at 100
	const collected: WordPressPostResponse[] = [];

	while (collected.length < limit) {
		const batch = await fetchWordPress(
			'posts',
			await withVertical({
				_embed: 1,
				per_page: Math.min(perPage, limit - collected.length),
				page: Math.floor(collected.length / perPage) + 1
			})
		);

		if (batch.length === 0) {
			break;
		}

		collected.push(...batch);

		if (batch.length < perPage) {
			break;
		}
	}

	// A silent empty sitemap is the failure mode we care about: the build stays green and the site
	// ships with no articles. Say it loudly so it shows up in the deploy log.
	if (collected.length === 0) {
		console.warn(
			`[wordpress] fetchAllPosts returned 0 posts from ${getWordPressApiBase()} — article routes and the sitemap will be empty.`
		);
	}

	return collected.map(normalizePost);
}

export async function fetchAllCategories(limit = 100) {
	const categories = (await fetchWordPress('categories', {
		per_page: limit,
		hide_empty: 0
	})) as WordPressCategoryResponse[];

	return categories.map(normalizeCategory);
}