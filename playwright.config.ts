import { defineConfig, devices } from '@playwright/test';

/**
 * Lives at the repository root on purpose. Playwright's own CLI is happy with
 * --config anywhere, but IDE integrations (WebStorm's gutter run button, the
 * VS Code extension) look for the config here to decide that a `.spec.ts` file
 * is a Playwright test at all - and with vitest also in the project, a missing
 * root config means they hand the file to the wrong runner.
 *
 * Points at the wp-env site started by `npm run env:start` (see .wp-env.json).
 * We don't drive the server from here: e2e tests assume the store is already
 * configured (permalinks, currency, payment method, ecommerce data layer) by
 * bin/wp-env-setup.sh. Test content is created per-test - see api/products.ts.
 */
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8888';

/**
 * @wordpress/e2e-test-utils-playwright reads WP_BASE_URL from the environment
 * for its own REST/admin helpers. Write it back so the browser's baseURL and
 * the utils' base URL can never drift apart. Playwright re-evaluates this
 * config in every worker process, so this applies there too.
 */
process.env.WP_BASE_URL = baseURL;

export default defineConfig( {
	testDir: './tests/e2e/specs',
	// Pinned so traces land in a predictable place no matter which directory
	// the run was started from; otherwise they follow the working directory
	// and CI has to guess the path to upload.
	outputDir: './tests/e2e/test-results',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL,
		trace: 'retain-on-failure',
	},
	projects: [
		// Verifies the store is configured the way the specs assume, once per
		// run, before any of them start - see setup/store.setup.ts.
		{
			name: 'setup',
			testDir: './tests/e2e/setup',
			testMatch: /.*\.setup\.ts/,
		},
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
			dependencies: [ 'setup' ],
		},
	],
} );
