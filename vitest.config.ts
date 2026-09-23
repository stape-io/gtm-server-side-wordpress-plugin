import { defineConfig } from 'vitest/config';

/**
 * Unit tests only. Vitest's default glob also matches `.spec.ts`, which pulls
 * in the Playwright specs under tests/e2e/ and blows up with "Playwright Test
 * did not expect test() to be called here". Those run via `npm run test:e2e`.
 *
 * This file was once removed on the theory that it was what made WebStorm hand
 * .spec.ts files to vitest instead of Playwright. It is not: the IDE does that
 * either way. See the note in package.json's sibling history and JetBrains
 * WEB-75027 - the detector needs `test` itself imported from '@playwright/test'
 * to recognise a Playwright file, and our specs import the extended `test` from
 * ../fixtures, which is Playwright's own documented fixtures pattern.
 *
 * Also tested and rejected: a side-effect `import '@playwright/test'` in the
 * spec, and importing `test` straight from '@wordpress/e2e-test-utils-playwright'
 * instead of our fixtures. Neither restores the gutter button, so there is no
 * arrangement of imports that keeps both the button and the fixtures. Run
 * Playwright from a Playwright run configuration until WEB-75027 ships.
 */
export default defineConfig( {
	test: {
		include: [ 'assets/src/**/*.test.ts' ],
	},
} );
