import { expect, test } from '../../fixtures';

const WEB_CONTAINER_ID = 'gtm_server_side_web_container_id';
const WEB_CONTAINER_URL = 'gtm_server_side_web_container_url';
const EXCLUDE_ROLES = 'gtm_server_side_gtm_exclude_roles';

const URL_MESSAGE = 'URL must be entered with https:// and without slashes at the end';

// Every test turns the same-origin proxy off first, the cases' baseline: on
// the e2e store it is on with no API key, and its own validation would block
// every save, whatever the field under test holds. Only the form changes; a
// save the validation lets through writes the database, which is why these
// tests are serial (siteState puts it back).

test( 'A Web GTM ID not in `GTM-…` format blocks saving with "Container id must be in GTM-XXXXXX format" @T9a06a029', { tag: '@serial' }, async ( {
	loginAsAdmin,
	adminSettingsPage,
	storedOption,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );

	for ( const value of [ 'ABC', 'gtm-abc' ] ) {
		await adminSettingsPage.webContainerIdInput.fill( value );
		expect( await adminSettingsPage.clickSave(), `the page reloaded after saving ${ value }` ).toBe( false );
		await expect( adminSettingsPage.savedNotice ).toBeHidden();
		await expect( adminSettingsPage.validationError( WEB_CONTAINER_ID ) ).toBeVisible();
		await expect( adminSettingsPage.validationError( WEB_CONTAINER_ID ) ).toHaveText( 'Container id must be in GTM-XXXXXX format' );
	}

	expect( await storedOption( WEB_CONTAINER_ID ) ).toBe( 'GTM-TESTID' );
} );

test( 'With "Add web GTM script" selected, an empty Web GTM ID blocks saving ("This field is required.") @T4520f17e', { tag: '@serial' }, async ( {
	loginAsAdmin,
	adminSettingsPage,
	storedOption,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );

	await adminSettingsPage.webContainerIdInput.clear();
	expect( await adminSettingsPage.clickSave(), 'the page reloaded' ).toBe( false );
	await expect( adminSettingsPage.savedNotice ).toBeHidden();
	await expect( adminSettingsPage.validationError( WEB_CONTAINER_ID ) ).toBeVisible();
	await expect( adminSettingsPage.validationError( WEB_CONTAINER_ID ) ).toHaveText( 'This field is required.' );

	expect( await storedOption( WEB_CONTAINER_ID ) ).toBe( 'GTM-TESTID' );
} );

test( 'An sGTM URL that isn\'t https or ends with a slash blocks saving with "URL must be entered with https:// and without slashes at the end" @T79058af9', { tag: '@serial' }, async ( {
	loginAsAdmin,
	adminSettingsPage,
	storedOption,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );

	for ( const value of [ 'https://sgtm.example.test/', 'http://sgtm.example.test' ] ) {
		await adminSettingsPage.webContainerUrlInput.fill( value );
		expect( await adminSettingsPage.clickSave(), `the page reloaded after saving ${ value }` ).toBe( false );
		await expect( adminSettingsPage.savedNotice ).toBeHidden();
		await expect( adminSettingsPage.validationError( WEB_CONTAINER_URL ) ).toBeVisible();
		await expect( adminSettingsPage.validationError( WEB_CONTAINER_URL ) ).toHaveText( URL_MESSAGE );
	}

	for ( const value of [ 'https://sgtm.example.test', 'https://example.test/metrics', '' ] ) {
		await adminSettingsPage.webContainerUrlInput.fill( value );
		expect( await adminSettingsPage.isValid( adminSettingsPage.webContainerUrlInput ), `valid() for "${ value }"` ).toBe( true );
		await expect( adminSettingsPage.validationError( WEB_CONTAINER_URL ) ).toBeHidden();
	}

	// The case's "Does it exist?": a fresh store has no row, one whose General
	// tab was ever saved keeps it empty. Either way neither URL was saved.
	expect( ( await storedOption( WEB_CONTAINER_URL ) ) ?? '' ).toBe( '' );
} );

test( '"Exclude GTM for user roles" shows the role list only while checked and blocks saving until a role is ticked ("Select at least one role") @T4612154a', { tag: '@serial' }, async ( {
	loginAsAdmin,
	adminSettingsPage,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );
	await expect( adminSettingsPage.excludedRolesList ).toBeHidden();

	await adminSettingsPage.excludeRolesCheckbox.check();
	await expect( adminSettingsPage.excludedRolesList ).toBeVisible();
	expect( await adminSettingsPage.excludedRoleOptions() ).toEqual( [
		{ role: 'Administrator', checked: false },
		{ role: 'Editor', checked: false },
		{ role: 'Author', checked: false },
		{ role: 'Contributor', checked: false },
		{ role: 'Subscriber', checked: false },
		{ role: 'Customer', checked: false },
		{ role: 'Shop manager', checked: false },
	] );

	expect( await adminSettingsPage.clickSave(), 'the page reloaded' ).toBe( false );
	await expect( adminSettingsPage.savedNotice ).toBeHidden();
	await expect( adminSettingsPage.validationError( EXCLUDE_ROLES ) ).toBeVisible();
	await expect( adminSettingsPage.validationError( EXCLUDE_ROLES ) ).toHaveText( 'Select at least one role' );

	await adminSettingsPage.excludedRoleCheckbox( 'Editor' ).check();
	expect( await adminSettingsPage.isValid( adminSettingsPage.excludeRolesCheckbox ) ).toBe( true );
	await expect( adminSettingsPage.validationError( EXCLUDE_ROLES ) ).toBeHidden();

	await adminSettingsPage.excludeRolesCheckbox.uncheck();
	await expect( adminSettingsPage.excludedRolesList ).toBeHidden();
} );

test( 'The Cookie Keeper checkbox is disabled and unchecked while the identifier is empty and becomes available once one is typed @T4c0e7239', { tag: '@serial' }, async ( {
	loginAsAdmin,
	adminSettingsPage,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );
	await expect( adminSettingsPage.cookieKeeperCheckbox ).toBeDisabled();
	await expect( adminSettingsPage.cookieKeeperCheckbox ).not.toBeChecked();

	// Typed key by key: the tab's script follows the identifier on keyup.
	await adminSettingsPage.webIdentifierInput.pressSequentially( 'abcdefgh' );
	await expect( adminSettingsPage.cookieKeeperCheckbox ).toBeEnabled();
	await adminSettingsPage.cookieKeeperCheckbox.check();
	await expect( adminSettingsPage.cookieKeeperCheckbox ).toBeChecked();

	await adminSettingsPage.clearWebIdentifierWithKeyboard();
	await expect( adminSettingsPage.cookieKeeperCheckbox ).toBeDisabled();
	await expect( adminSettingsPage.cookieKeeperCheckbox ).not.toBeChecked();
} );
