import { defineConfig } from 'vitest/config';

/**
 * Unit tests only: vitest's default glob would also pick up the Playwright
 * specs under tests/e2e/, which run via `npm run test:e2e`.
 */
export default defineConfig( {
	test: {
		include: [ 'assets/src/**/*.test.ts' ],
	},
} );
