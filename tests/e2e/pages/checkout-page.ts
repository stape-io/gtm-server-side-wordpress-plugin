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
	 * Checkout block has saved them to the customer session: it posts the
	 * address to the Store API (cart/update-customer, inside wc/store/v1/batch)
	 * as it changes, and the batch to wait for is the one carrying this test's
	 * email and the last field typed, the postcode.
	 */
	async fillBillingDetails( details: BillingDetails ): Promise< void > {
		const saved = this.page.waitForResponse( ( response ) => {
			const posted = response.request().postData() ?? '';
			return (
				response.url().includes( '/wc/store/v1/batch' ) &&
				posted.includes( `"email":"${ details.email }"` ) &&
				posted.includes( `"postcode":"${ details.postcode }"` )
			);
		} );

		await this.form.getByLabel( 'Email address' ).fill( details.email );
		await this.form.getByLabel( 'First name' ).fill( details.firstName );
		await this.form.getByLabel( 'Last name' ).fill( details.lastName );
		await this.form.getByLabel( 'Address', { exact: true } ).fill( details.address );
		await this.form.getByLabel( 'City' ).fill( details.city );
		await this.form.getByLabel( 'ZIP Code' ).fill( details.postcode );
		await this.form.getByLabel( 'ZIP Code' ).blur();

		// The batch itself always answers 207 Multi-Status; each request in it
		// carries its own status in the body. Checked after the wait, not in it,
		// so a rejected save fails with its status instead of a timeout.
		const { responses } = ( await ( await saved ).json() ) as { responses: Array< { status: number } > };
		expect(
			responses.map( ( { status } ) => status ),
			'Saving the billing details: statuses of the Store API batch requests'
		).toEqual( responses.map( () => 200 ) );
	}
}
