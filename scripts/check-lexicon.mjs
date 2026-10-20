#!/usr/bin/env node
/**
 * Lexicon gate for wellroost.com.
 *
 * lexicon.md lists the terms this brand refuses to ship. Until now that list was advisory: nothing
 * read it, so a generated paragraph could contradict the brand voice and still deploy. This script
 * makes the list binding — it scans the copy-bearing source for prohibited terms and exits non-zero
 * on a hit.
 *
 *     node scripts/check-lexicon.mjs
 *     npm run check:lexicon
 *
 * Scope: files that can reach a reader (pages, components, layout, content markdown). NOT scanned:
 * node_modules, dist, .astro, and any file with `lexicon-allow` in the offending line's file header
 * comment — occasionally a prohibition needs to be quoted, e.g. in this document's own test cases.
 *
 * When a hit is intentional (a quote, a customer's words, a test fixture), silence it inline:
 *     <!-- lexicon-allow: quoted competitor copy -->
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();

// Kept in sync with lexicon.md "Prohibited Terms". Matched case-insensitively on word boundaries,
// plus the phrase bans, which are matched as substrings because they contain punctuation.
const PROHIBITED = [
	'delve',
	'harness',
	'testament',
	'tapestry',
	'landscape',
	'beacon',
	'unleash',
	'supercharge',
	'revolutionize',
	'elevate',
	'embark',
	'plethora',
	'synergy',
	'dream home',
	'sanctuary oasis',
	'forever home',
	'nest egg',
	'game-changer',
	'curb appeal magic'
];

const PHRASES = [
	"in today's fast-paced digital world",
	'when it comes to home improvement',
	'it is important to keep in mind that'
];

const SCAN_DIRS = ['src'];
const SCAN_EXT = new Set(['.astro', '.md', '.mdx', '.tsx', '.ts']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git']);

const ALLOW_MARKER = 'lexicon-allow';

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			if (!SKIP_DIRS.has(entry)) walk(full, out);
			continue;
		}
		if (SCAN_EXT.has(extname(entry))) out.push(full);
	}
	return out;
}

const hits = [];

for (const dir of SCAN_DIRS) {
	let files;
	try {
		files = walk(join(ROOT, dir));
	} catch {
		// A repo without the directory scanned has nothing to violate.
		continue;
	}
	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		const rel = relative(ROOT, file);
		text.split('\n').forEach((line, index) => {
			if (line.includes(ALLOW_MARKER)) return;
			const lower = line.toLowerCase();

			for (const term of PROHIBITED) {
				const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
				if (pattern.test(lower)) {
					hits.push({ file: rel, line: index + 1, term, text: line.trim().slice(0, 100) });
				}
			}
			for (const phrase of PHRASES) {
				if (lower.includes(phrase)) {
					hits.push({ file: rel, line: index + 1, term: phrase, text: line.trim().slice(0, 100) });
				}
			}
		});
	}
}

if (hits.length === 0) {
	console.log(`\u001b[32mGREEN\u001b[0m — no prohibited terms in ${SCAN_DIRS.join(', ')} (${PROHIBITED.length} terms + ${PHRASES.length} phrases)`);
	process.exit(0);
}

console.error(`\u001b[31mRED\u001b[0m — ${hits.length} prohibited term(s) found. See lexicon.md.\n`);
for (const hit of hits) {
	console.error(`  ${hit.file}:${hit.line}  "${hit.term}"`);
	console.error(`      ${hit.text}`);
}
console.error('\nRewrite the copy, or mark the line with `lexicon-allow` if it is a deliberate quote.');
process.exit(1);
