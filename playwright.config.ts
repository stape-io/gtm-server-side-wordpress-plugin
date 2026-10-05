import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Points at the e2e wp-env site started by `npm run env:e2e:start` (see
 * .wp-env.e2e.json and tests/e2e/README.md). The store is configured by
 * bin/wp-env-configure.sh; test content is created per test.
 */
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8889';

/**
 * @wordpress/e2e-test-utils-playwright reads WP_BASE_URL from the environment
 * for its own REST/admin helpers. Write it back so the browser's baseURL and
 * the utils' base URL can never drift apart. Playwright re-evaluates this
 * config in every worker process, so this applies there too.
 */
process.env.WP_BASE_URL = baseURL;

/**
 * Where @wordpress/e2e-test-utils-playwright keeps the admin's auth cookies.
 * Pinned for the same reason as outputDir below.
 */
process.env.STORAGE_STATE_PATH ??= path.join( __dirname, 'tests/e2e/artifacts/storage-states/admin.json' );

export default defineConfig( {
	testDir: './tests/e2e/specs',
	// Pinned so output lands in a predictable place no matter which directory
	// the run was started from, which is also what CI uploads.
	outputDir: './tests/e2e/test-results',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [
				[ 'github' ],
				[ 'html', { open: 'never', outputFolder: 'tests/e2e/playwright-report' } ],
				// Reports each run to Testomat, matching results to cases by the
				// @T{id} tag in the test title. Left out without a token (PRs from
				// forks get no secrets), so the suite never depends on it.
				...( process.env.TESTOMATIO
					? [
							[
								'@testomatio/reporter/playwright',
								{ apiKey: process.env.TESTOMATIO },
							] as const,
					  ]
					: [] ),
		  ]
		: 'list',
	expect: {
		// add_to_cart can arrive a couple of seconds after the click - see
		// DataLayer.expectPushedOnce().
		timeout: 10_000,
	},
	use: {
		baseURL,
		trace: 'retain-on-failure',
	},
	projects: [
		// Checks the store is configured the way the specs assume, once per
		// run, before any of them start - see setup/preflight.setup.ts.
		{
			name: 'preflight',
			testDir: './tests/e2e/setup',
			testMatch: /.*\.setup\.ts/,
		},
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
			dependencies: [ 'preflight' ],
		},
	],
} );
