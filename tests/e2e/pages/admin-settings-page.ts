import type { Locator, Page } from '@playwright/test';

/** The plugin's settings page in wp-admin, for a browser logged in as the admin (loginAsAdmin()). */
export class AdminSettingsPage {
	constructor( private readonly page: Page ) {}

	/** Opens the settings on the tab `tab` names in its URL. */
	async goto( tab: 'general' | 'data-layer' ): Promise< void > {
		await this.page.goto( `/wp-admin/options-general.php?page=gtm-server-side-admin-settings&tab=${ tab }` );
	}

	/** Clicks "Save Changes"; the result is the notice, or the field error the form shows instead. */
	async saveChanges(): Promise< void > {
		await this.page.getByRole( 'button', { name: 'Save Changes' } ).click();
	}

	/** WordPress's notice after a save went through. */
	get savedNotice(): Locator {
		return this.page.getByText( 'Settings saved.' );
	}

	// The settings' fields have no label element, and their table has
	// role=presentation, so no role or label names them. Their ids are the
	// options they save, which the plugin's admin script finds them by too.

	/** General tab: the "Load GTM with consent" placement. */
	get gtmConsentPlacement(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option and value the field saves.
		return this.page.locator( '#gtm_server_side_placement-gtm_consent' );
	}

	/** General tab: "Web Google Tag Manager ID". */
	get webContainerIdField(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_web_container_id' );
	}

	/** General tab: the validation error the admin script puts right under "Web Google Tag Manager ID". */
	get webContainerIdError(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- jQuery Validate names the error label after the field's id.
		return this.page.locator( '#gtm_server_side_web_container_id-error' );
	}

	/** General tab: turns the same-origin proxy switch off, if it is on. */
	async turnSameOriginOff(): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		const toggle = this.page.locator( '#gtm_server_side_same_origin_enable' );
		if ( await toggle.isChecked() ) {
			// The switch's slider covers the checkbox, so the click goes to its label, as a mouse's does.
			// eslint-disable-next-line playwright/no-raw-locators -- the switch's label has no text either; it is the one for the option's id.
			await this.page.locator( 'label[for="gtm_server_side_same_origin_enable"]' ).click();
		}
	}

	/** Data Layer tab: "Add ecommerce Data Layer events". */
	get ecommerceCheckbox(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_data_layer_ecommerce' );
	}

	/** Data Layer tab: "Add user data to Data Layer events". */
	get userDataCheckbox(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_data_layer_user_data' );
	}
}
