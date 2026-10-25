import { describe, expect, it } from 'vitest';
import { articleTools, mappedPostCount, toolsForPost } from '../../data/article-tools';
import { engineBySlug } from '../calculators/registry';

/**
 * The pairing map is editorial data pointing at code. Every failure it can have is silent in the
 * browser — an unknown tool slug renders nothing, a wrong post slug renders nothing — so it is
 * checked here rather than discovered by noticing a page that has no link on it.
 */
describe('article → engine pairings', () => {
	it('every tool slug resolves to a registered engine', () => {
		const unknown = Object.entries(articleTools).flatMap(([post, entries]) =>
			entries.filter((e) => !engineBySlug(e.tool)).map((e) => `${post} → ${e.tool}`)
		);
		expect(unknown).toEqual([]);
	});

	it('every pairing carries a real note, not a placeholder', () => {
		const thin = Object.entries(articleTools).flatMap(([post, entries]) =>
			entries.filter((e) => e.note.trim().length < 24).map((e) => `${post} → ${e.tool}`)
		);
		expect(thin).toEqual([]);
	});

	it('does not pair the same engine twice on one post', () => {
		const dupes = Object.entries(articleTools)
			.filter(([, entries]) => new Set(entries.map((e) => e.tool)).size !== entries.length)
			.map(([post]) => post);
		expect(dupes).toEqual([]);
	});

	it('returns nothing for an unmapped post rather than throwing', () => {
		expect(toolsForPost('a-post-that-does-not-exist')).toEqual([]);
	});

	it('counts what the audit script reports', () => {
		expect(mappedPostCount).toBe(Object.keys(articleTools).length);
		expect(mappedPostCount).toBeGreaterThan(0);
	});
});
