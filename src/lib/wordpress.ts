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
	title?: WordPressRenderedField;
	content?: WordPressRenderedField;
	slug?: string;
	_embedded?: {
		'wp:featuredmedia'?: WordPressMedia[];
		'wp:term'?: WordPressTerm[][];
	};
}

export interface WordPressPost {
	id: number;
	title: string;
	excerpt: string;
	content: string;
	slug: string;
	link: string;
	date: string | null;
	featuredImage: string | null;
	featuredImageAlt: string;
	categoryLabel: string | null;
	categorySlug: string | null;
}

const HTML_ENTITY_MAP: Record<string, string> = {
	'&amp;': '&',
	'&quot;': '"',
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
		import.meta.env.PUBLIC_WORDPRESS_API_BASE ?? import.meta.env.WORDPRESS_API_BASE ?? '';
	return baseUrl.replace(/\/$/, '');
}

function decodeHtmlEntities(value: string) {
	return value.replace(
		/&amp;|&quot;|&#039;|&#8217;|&#8211;|&#8220;|&#8221;|&#8230;|&nbsp;/g,
		(entity) => HTML_ENTITY_MAP[entity] ?? entity
	);
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

	return {
		id: post.id,
		title: stripHtml(post.title?.rendered) || 'Untitled post',
		excerpt: stripHtml(post.excerpt?.rendered),
		content: post.content?.rendered || '',
		slug: post.slug || '',
		link: post.link ?? '#',
		date: post.date ?? null,
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

	try {
		const response = await fetch(url);
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
