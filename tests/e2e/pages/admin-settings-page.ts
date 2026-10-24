import type { Locator, Page } from '@playwright/test';

/** The plugin's settings page in wp-admin, for a browser logged in as the admin (loginAsAdmin()). */
export class AdminSettingsPage {
	constructor( private readonly page: Page ) {}

	/** Opens the settings on the tab `tab` names in its URL. */
	async goto( tab: 'data-layer' ): Promise< void > {
		await this.page.goto( `/wp-admin/options-general.php?page=gtm-server-side-admin-settings&tab=${ tab }` );
	}

	// The settings' checkboxes have no label element, and their table has
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
}
