import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards for the reading layout that no unit test can see and no desktop browser shows.
 *
 * Two defects shipped together and were invisible on a laptop:
 *
 * 1. A body from WordPress carries bare source URLs. One ~600px token set the *min-content* width
 *    of the article body, the grid column grew to it, and the body rendered 603px wide inside a
 *    390px phone viewport — with `body { overflow-x: hidden }` clipping the right third of every
 *    line out of reach. `overflow-wrap: anywhere` is the only keyword that changes intrinsic
 *    sizing; `break-word` looks identical and fixes nothing.
 * 2. `[data-reveal]` used a ratio threshold of 0.08. On a block thousands of pixels tall — the
 *    whole article body was one — the ratio was cleared a full screen late, and once the block was
 *    also wider than the viewport the ratio could never be reached at all, so the text never
 *    faded in.
 *
 * Both are one-line reverts, so they are pinned here as source assertions.
 */

const WITHOUT_COMMENTS = /\/\*[\s\S]*?\*\//g;

const read = (relative: string) =>
	readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(WITHOUT_COMMENTS, '');

const css = read('../../styles/global.css');
const layout = read('../../layouts/BaseLayout.astro');

function ruleBody(source: string, selector: string): string {
	const start = source.indexOf(`${selector} {`);
	expect(start, `${selector} is missing`).toBeGreaterThan(-1);
	return source.slice(start, source.indexOf('}', start));
}

describe('article body', () => {
	it('breaks unbreakable CMS tokens instead of widening the column', () => {
		expect(ruleBody(css, '.article-body')).toContain('overflow-wrap: anywhere');
	});

	it('keeps code on one measure', () => {
		expect(css).toContain('.article-body pre,');
		expect(ruleBody(css, '.article-body pre')).toContain('overflow-x: auto');
	});
});

describe('entrance motion', () => {
	it('fires on any intersection and starts before the block is on screen', () => {
		expect(layout).toMatch(/rootMargin: '0px 0px \d+% 0px',\s*threshold: 0\s*\}/);
	});
});
