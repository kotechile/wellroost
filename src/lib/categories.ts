import { fetchAllCategories } from './wordpress';

export interface CategoryRecord {
	id: string;
	name: string;
	slug: string;
	description: string;
	level: number;
	parentCategoryId: string | null;
	wordpressCategoryId: number | null;
	wordpressSiteDomain: string | null;
	postCount: number | null;
	children: CategoryRecord[];
}

const FALLBACK_CATEGORIES: CategoryRecord[] = [
	{
		id: 'home-finances',
		name: 'Home Finances',
		slug: 'home-finances',
		description: 'Frameworks for maintenance budgeting, smart upgrades, insurance, and hidden property expenses.',
		level: 1,
		parentCategoryId: null,
		wordpressCategoryId: null,
		wordpressSiteDomain: 'wellroost.com',
		postCount: 0,
		children: []
	},
	{
		id: 'renovations-roi',
		name: 'Renovations & ROI',
		slug: 'renovations-roi',
		description: 'Calculations for value-add remodeling, move vs improve tradeoffs, and equity-building renovations.',
		level: 1,
		parentCategoryId: null,
		wordpressCategoryId: null,
		wordpressSiteDomain: 'wellroost.com',
		postCount: 0,
		children: []
	},
	{
		id: 'energy-systems',
		name: 'Energy & Systems',
		slug: 'energy-systems',
		description: 'Objective math behind utility savings, heat pumps, solar transition, and preventive system maintenance.',
		level: 1,
		parentCategoryId: null,
		wordpressCategoryId: null,
		wordpressSiteDomain: 'wellroost.com',
		postCount: 0,
		children: []
	},
	{
		id: 'gear-ecosystems',
		name: 'Gear Ecosystems',
		slug: 'gear-ecosystems',
		description: 'Rigorous evaluations to ensure you invest in the right property tools and battery platforms.',
		level: 1,
		parentCategoryId: null,
		wordpressCategoryId: null,
		wordpressSiteDomain: 'wellroost.com',
		postCount: 0,
		children: []
	}
];

let categoryCache: Promise<CategoryRecord[]> | undefined;

async function loadCategories(): Promise<CategoryRecord[]> {
	try {
		const liveCategories = await fetchAllCategories(100);
		if (liveCategories.length > 0) {
			const filtered = liveCategories
				.filter((category) => !category.parent && category.slug !== 'uncategorized')
				.map((category) => ({
					id: String(category.id),
					name: category.name,
					slug: category.slug,
					description: category.description,
					level: 1,
					parentCategoryId: null,
					wordpressCategoryId: category.id,
					wordpressSiteDomain: 'wellroost.com',
					postCount: category.count,
					children: []
				}));
			
			if (filtered.length > 0) {
				return filtered;
			}
		}
	} catch (error) {
		console.error('Failed to fetch live categories from WordPress:', error);
	}

	return FALLBACK_CATEGORIES;
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
	categoryCache ??= loadCategories();
	return categoryCache;
}

export async function getTopLevelCategories(): Promise<CategoryRecord[]> {
	const categories = await getAllCategories();
	return categories
		.filter((category) => !category.parentCategoryId)
		.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
	const categories = await getAllCategories();
	return categories.find((category) => category.slug === slug) ?? null;
}
