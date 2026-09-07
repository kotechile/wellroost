import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();

function findExistingFile(candidates: string[]) {
	for (const candidate of candidates) {
		const absolutePath = resolve(ROOT_DIR, candidate);
		if (existsSync(absolutePath)) {
			return absolutePath;
		}
	}

	return null;
}

export function resolveCategoryCsvPath() {
	return findExistingFile([
		'wellroost_categories.csv',
		'wordpress_categories.csv',
		'wordpress _categories.csv',
		'categories.csv'
	]);
}

export function resolveOverviewPath() {
	return findExistingFile([
		'wellroost_overview.md',
		'overview.md'
	]);
}
