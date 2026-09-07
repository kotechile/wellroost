interface WordPressRenderedField {
	rendered?: string;
}

interface WordPressMedia {
	source_url?: string;
	alt_text?: string;
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

function decodeHtmlEntities(value: string) {
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
	
	let featuredImage = featuredMedia?.source_url ?? null;
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
		categoryLabel: category?.name ?? null,
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
		if (value !== undefined && value !== '') {
			url.searchParams.set(key, String(value));
		}
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

export function hasWordPressApiBase() {
	return Boolean(getWordPressApiBase());
}

export function getConfiguredWordPressApiBase() {
	return getWordPressApiBase();
}

export async function fetchLatestPosts(limit = 6) {
	const posts = await fetchWordPress('posts', {
		_embed: 1,
		per_page: limit
	});
	return posts.map(normalizePost);
}

export async function fetchPostsByCategory(categoryId: number, limit = 12) {
	const posts = await fetchWordPress('posts', {
		_embed: 1,
		categories: categoryId,
		per_page: limit
	});
	return posts.map(normalizePost);
}

export async function searchPosts(query: string, limit = 8) {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return [];
	}

	const posts = await fetchWordPress('posts', {
		_embed: 1,
		search: trimmedQuery,
		per_page: limit
	});
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
	const posts = await fetchWordPress('posts', {
		_embed: 1,
		per_page: limit
	});
	return posts.map(normalizePost);
}

export async function fetchAllCategories(limit = 100) {
	const categories = (await fetchWordPress('categories', {
		per_page: limit,
		hide_empty: 0
	})) as WordPressCategoryResponse[];

	return categories.map(normalizeCategory);
}
