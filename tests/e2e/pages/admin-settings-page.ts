import { expect, type Locator, type Page } from '@playwright/test';

/** The plugin's settings page in wp-admin, for a browser logged in as the admin (loginAsAdmin()). */
export class AdminSettingsPage {
	constructor( private readonly page: Page ) {}

	/** Opens the settings on the tab `tab` names in its URL; General has none. */
	async goto( tab: 'general' | 'data-layer' ): Promise< void > {
		const query = tab === 'general' ? '' : `&tab=${ tab }`;
		await this.page.goto( `/wp-admin/options-general.php?page=gtm-server-side-admin-settings${ query }` );
	}

	/** Clicks "Save Changes" and waits for the settings page it reloads into. */
	async save(): Promise< void > {
		await this.page.getByRole( 'button', { name: 'Save Changes' } ).click();
		await this.page.waitForURL( /[?&]settings-updated=true/ );
	}

	/** The notice WordPress shows after a save. */
	get savedNotice(): Locator {
		return this.page.getByText( 'Settings saved.' );
	}

	// The settings' fields have no label element, and their table has
	// role=presentation, so no role or label names them. Their ids are the
	// options they save, which the plugin's admin script finds them by too.

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

	/** General tab: "Web Google Tag Manager ID". */
	get webContainerIdInput(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_web_container_id' );
	}

	/** General tab: "Server GTM container URL", shown while the same-origin proxy is off. */
	get webContainerUrlInput(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_web_container_url' );
	}

	/** General tab: "Stape container identifier", shown while the same-origin proxy is off. */
	get webIdentifierInput(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_web_identifier' );
	}

	/**
	 * General tab: turns the "Same-origin proxy" switch on or off. Off, the
	 * tab shows the sGTM URL, identifier and Cookie Keeper rows again.
	 */
	async setSameOriginProxy( on: boolean ): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		const checkbox = this.page.locator( '#gtm_server_side_same_origin_enable' );
		// The checkbox is a 1px transparent input under its switch, the label
		// the user clicks, which takes the click.
		if ( ( await checkbox.isChecked() ) !== on ) {
			// eslint-disable-next-line playwright/no-raw-locators -- the switch has no text or accessible name; it is the label of the field above.
			await this.page.locator( 'label[for="gtm_server_side_same_origin_enable"]' ).click();
		}
		await expect( checkbox ).toBeChecked( { checked: on } );
		await expect( this.webContainerUrlInput ).toBeVisible( { visible: ! on } );
	}
}
