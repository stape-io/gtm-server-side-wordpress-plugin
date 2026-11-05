import { expect, type Locator, type Page } from '@playwright/test';

/** The plugin's settings page in wp-admin, for a browser logged in as the admin (loginAsAdmin()). */
export class AdminSettingsPage {
	/** `serial`: the test runs in the serial project, the only one that may save (see save()). */
	constructor(
		private readonly page: Page,
		private readonly serial: boolean
	) {}

	/** Opens the settings on the tab `tab` names in its URL; General has none. */
	async goto( tab: 'general' | 'data-layer' ): Promise< void > {
		const query = tab === 'general' ? '' : `&tab=${ tab }`;
		await this.page.goto( `/wp-admin/options-general.php?page=gtm-server-side-admin-settings${ query }` );
	}

	/**
	 * Clicks "Save Changes" and waits for the settings page it reloads into.
	 * The save writes the database every page reads, so only a serial test
	 * may make it; the siteState fixture puts it back after the test.
	 */
	async save(): Promise< void > {
		this.requireSerial();
		await this.saveButton.click();
		await this.page.waitForURL( /[?&]settings-updated=true/ );
	}

	/**
	 * Clicks "Save Changes" where the tab's script should block the save, and
	 * returns whether the page reloaded. The script blocks it on the click
	 * itself; a form it lets through navigates, which the click waits to
	 * start, so the marker set before it is gone. A save that goes through
	 * writes the database, so this is serial-only too.
	 */
	async clickSave(): Promise< boolean > {
		this.requireSerial();
		await this.page.evaluate( () => {
			( window as SamePageMarker ).gtmE2eSamePage = true;
		} );
		await this.saveButton.click();
		return ! ( await this.page.evaluate( () => ( window as SamePageMarker ).gtmE2eSamePage === true ) );
	}

	/**
	 * The message the tab's validation (jQuery Validate) shows for the field
	 * with id `fieldId`, where the plugin's admin script places it: right
	 * after the field, or in the message line under the role list for
	 * "Exclude GTM for user roles". Hidden once the field is valid.
	 */
	validationError( fieldId: string ): Locator {
		// jQuery Validate's error is a label with no role, tied to its field
		// only by `for`; the places are the admin script's errorPlacement.
		const place =
			fieldId === 'gtm_server_side_gtm_exclude_roles'
				? '.js-gtm-server-side-gtm-exclude-roles-message >'
				: `#${ fieldId } +`;
		return this.page.locator( `${ place } label.error[for="${ fieldId }"]` );
	}

	/**
	 * Runs the tab's validation on one field, as the cases'
	 * `jQuery( '#<id>' ).valid()` in the console does: shows or hides its
	 * message, and returns whether the value passes.
	 */
	async isValid( field: Locator ): Promise< boolean > {
		return field.evaluate( ( element ) => ( window as unknown as { jQuery: JQueryValid } ).jQuery( element ).valid() );
	}

	private requireSerial(): void {
		if ( ! this.serial ) {
			throw new Error( "Saving the settings changes every page: tag the test { tag: '@serial' }." );
		}
	}

	private get saveButton(): Locator {
		return this.page.getByRole( 'button', { name: 'Save Changes' } );
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

	/** General tab: "Cookie Keeper", shown while the same-origin proxy is off. */
	get cookieKeeperCheckbox(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_cookie_keeper' );
	}

	/** General tab: "Exclude GTM for user roles". */
	get excludeRolesCheckbox(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- no accessible name (see above); the id is the option the field saves.
		return this.page.locator( '#gtm_server_side_gtm_exclude_roles' );
	}

	/** General tab: the role list under "Exclude GTM for user roles", shown while it is ticked. */
	get excludedRolesList(): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- the list has no role or name; its js- class is the hook the plugin's admin script shows and hides it by.
		return this.page.locator( '.js-gtm-server-side-gtm-exclude-roles-block' );
	}

	/**
	 * Empties "Stape container identifier" with Backspace, key by key, as a
	 * user does: the tab's script follows the field on keyup only.
	 */
	async clearWebIdentifierWithKeyboard(): Promise< void > {
		const length = ( await this.webIdentifierInput.inputValue() ).length;
		// press() focuses the field with the caret before its text, where
		// Backspace deletes nothing.
		await this.webIdentifierInput.press( 'End' );
		for ( let key = 0; key < length; key++ ) {
			await this.webIdentifierInput.press( 'Backspace' );
		}
		await expect( this.webIdentifierInput ).toHaveValue( '' );
	}

	/** One role's checkbox in the list, by the role's name ("Editor"). */
	excludedRoleCheckbox( name: string ): Locator {
		return this.excludedRolesList.getByRole( 'checkbox', { name, exact: true } );
	}

	/** The roles the list offers, in its order, with whether each is ticked. */
	async excludedRoleOptions(): Promise< Array< { role: string; checked: boolean } > > {
		const options = [];
		for ( const checkbox of await this.excludedRolesList.getByRole( 'checkbox' ).all() ) {
			options.push( {
				// The label wraps the checkbox, so its text is the role's name.
				role: ( await checkbox.evaluate( ( element ) => element.closest( 'label' )?.textContent ?? '' ) ).trim(),
				checked: await checkbox.isChecked(),
			} );
		}
		return options;
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

/** What clickSave() leaves on the page's window until it reloads. */
type SamePageMarker = Window & { gtmE2eSamePage?: boolean };

/** jQuery with the jQuery Validate plugin the settings page loads. */
type JQueryValid = ( element: Element ) => { valid: () => boolean };
