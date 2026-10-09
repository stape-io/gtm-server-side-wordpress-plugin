import { expect, type Page } from '@playwright/test';
import type { BillingDetails } from '../api/customers';

/** The Checkout block page. */
export class CheckoutPage {
	constructor( private readonly page: Page ) {}

	async goto() {
		await this.page.goto( '/checkout/' );
	}

	async reload() {
		await this.page.reload();
	}

	private get form() {
		return this.page.getByRole( 'form', { name: 'Checkout' } );
	}

	/**
	 * Types the billing details without placing the order, and waits until the
	 * Checkout block has saved them to the customer session: it posts each
	 * change to the Store API (cart/update-customer, inside wc/store/v1/batch),
	 * and the last field typed is the postcode.
	 */
	async fillBillingDetails( details: BillingDetails ): Promise< void > {
		const saved = this.page.waitForResponse(
			( response ) =>
				response.url().includes( '/wc/store/v1/batch' ) &&
				( response.request().postData() ?? '' ).includes( `"postcode":"${ details.postcode }"` )
		);

		await this.form.getByLabel( 'Email address' ).fill( details.email );
		await this.form.getByLabel( 'First name' ).fill( details.firstName );
		await this.form.getByLabel( 'Last name' ).fill( details.lastName );
		await this.form.getByLabel( 'Address', { exact: true } ).fill( details.address );
		await this.form.getByLabel( 'City' ).fill( details.city );
		await this.form.getByLabel( 'ZIP Code' ).fill( details.postcode );
		await this.form.getByLabel( 'ZIP Code' ).blur();

		// Checked after the wait, not in it: a rejected save then fails with its
		// status instead of a timeout.
		const response = await saved;
		expect( response.ok(), `Saving the billing details returned ${ response.status() }` ).toBe( true );
	}
}
