import { expect, test } from '../../fixtures';

test( 'With "Load GTM with consent" selected, an empty Web GTM ID blocks saving @Teff0f923', async ( {
	loginAsAdmin,
	adminSettingsPage,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );

	// The case's Baseline has the same-origin proxy off. The e2e store has it
	// on without an API key, which blocks every save on its own.
	await adminSettingsPage.turnSameOriginOff();
	await adminSettingsPage.gtmConsentPlacement.check();
	await adminSettingsPage.webContainerIdField.fill( '' );
	await adminSettingsPage.saveChanges();

	// The error exists only on the page the click was made on: a reload
	// renders the form without it. A blocked save writes nothing, so the
	// spec runs in parallel; if it ever goes through, it changes the store.
	await expect( adminSettingsPage.webContainerIdError ).toHaveText( 'This field is required.' );
	await expect( adminSettingsPage.savedNotice ).toBeHidden();

	await adminSettingsPage.goto( 'general' );
	await expect( adminSettingsPage.webContainerIdField ).toHaveValue( 'GTM-TESTID' );
} );
