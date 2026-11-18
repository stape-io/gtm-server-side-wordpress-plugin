import { expect, type Page } from '@playwright/test';

/** The plugin's name on the Plugins screen, from the header of gtm-server-side.php. */
const PLUGIN_NAME = 'Stape Conversion Tracking';

/** wp-admin's Plugins screen, for a browser logged in as the admin (loginAsAdmin()). */
export class PluginsPage {
	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/wp-admin/plugins.php' );
	}

	/** Clicks "Deactivate" under the plugin; waits for WordPress's notice. */
	async deactivatePlugin(): Promise< void > {
		await this.page.getByRole( 'link', { name: `Deactivate ${ PLUGIN_NAME }` } ).click();
		await expect( this.page.getByText( 'Plugin deactivated.' ) ).toBeVisible();
	}

	/** Clicks "Activate" under the plugin, which runs its activation hook; waits for WordPress's notice. */
	async activatePlugin(): Promise< void > {
		await this.page.getByRole( 'link', { name: `Activate ${ PLUGIN_NAME }` } ).click();
		await expect( this.page.getByText( 'Plugin activated.' ) ).toBeVisible();
	}
}
