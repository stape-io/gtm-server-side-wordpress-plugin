// Lints the Playwright suite in tests/e2e. The rules it enforces are written
// up in tests/e2e/README.md ("Writing specs"); this file is the part a
// machine can check.
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';

const E2E = 'tests/e2e/**/*.ts';
const SPECS = 'tests/e2e/specs/**/*.spec.ts';

export default tseslint.config(
	{
		ignores: [ 'tests/e2e/test-results/**', 'tests/e2e/playwright-report/**', 'tests/e2e/artifacts/**' ],
	},
	{
		files: [ E2E ],
		extends: [ tseslint.configs.recommended, playwright.configs[ 'flat/recommended' ] ],
		plugins: { '@eslint-community/eslint-comments': eslintComments },
		linterOptions: { reportUnusedDisableDirectives: 'error' },
		rules: {
			// An exception names its rule and says why, after "--".
			'@eslint-community/eslint-comments/require-description': 'error',
			'@eslint-community/eslint-comments/no-unlimited-disable': 'error',
			'@typescript-eslint/no-unused-vars': [ 'error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' } ],

			// The plugin's recommended set only warns about these; here they fail.
			'playwright/no-wait-for-timeout': 'error',
			'playwright/no-wait-for-selector': 'error',
			'playwright/no-conditional-in-test': 'error',
			'playwright/no-conditional-expect': 'error',
			'playwright/no-skipped-test': 'error',
			'playwright/no-force-option': 'error',
			'playwright/no-element-handle': 'error',
			'playwright/no-eval': 'error',
			'playwright/no-page-pause': 'error',

			// Locator priority: role, label, text. CSS only for a stable
			// WooCommerce core hook, with an eslint-disable comment saying why.
			'playwright/no-raw-locators': 'error',
			'playwright/prefer-native-locators': 'error',
			'playwright/no-get-by-title': 'error',
			'playwright/no-nth-methods': 'error',
		},
	},
	{
		files: [ SPECS ],
		rules: {
			'playwright/valid-title': [
				'error',
				{ mustMatch: { test: [ ' @T[0-9a-f]{8}$', 'The title is the Testomat case title followed by @T<case id>' ] } },
			],
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{ name: '@playwright/test', message: 'Import test and expect from ../fixtures.' },
						{ name: '@wordpress/e2e-test-utils-playwright', message: 'Import test and expect from ../fixtures.' },
					],
				},
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: ":function > ObjectPattern > Property[key.name='page']",
					message: 'Specs never touch page: navigate and interact through a page object.',
				},
				{
					selector: "VariableDeclarator > ObjectPattern > Property[key.name='page']",
					message: 'Specs never touch page: navigate and interact through a page object.',
				},
				{
					selector: "MemberExpression[property.name='page'], MemberExpression[property.value='page']",
					message: 'Specs never touch page: navigate and interact through a page object.',
				},
				{
					selector: "CallExpression[callee.object.name='test'][callee.property.name='step']",
					message: 'Specs do not use test.step: one test per Testomat case, read top to bottom.',
				},
			],
		},
	}
);
