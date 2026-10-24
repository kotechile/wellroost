import { defineConfig } from 'vitest/config';

/**
 * The engines are pure functions, so the suite runs in node with no DOM and no Astro.
 * Files live beside the engines they pin (`src/lib/calculators/__tests__`), because a fixture
 * ledger that drifts away from the code it protects stops being read.
 */
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
