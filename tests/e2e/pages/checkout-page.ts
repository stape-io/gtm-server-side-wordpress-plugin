import { expect, type Locator, type Page, type Response } from '@playwright/test';
import type { BillingDetails } from '../api/customers';

/** An order placed without the browser rendering a page (see placeOrderThroughStoreApi()). */
export type PlacedOrder = {
	id: number;
	/** The order-received URL the checkout would send the browser to, order key included. */
	receivedUrl: string;
};

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

		await this.expectSaved( await saved, 'Saving the billing details' );
	}

	/**
	 * Replaces the contact email only, for a logged-in customer whose billing
	 * address the checkout already shows from the account, and waits until the
	 * Store API batch carrying it has saved it to the customer session. After
	 * an order, the checkout shows that order's email, and then there is
	 * nothing to save.
	 */
	async fillContactEmail( email: string ): Promise< void > {
		const field = this.form.getByLabel( 'Email address' );
		if ( ( await field.inputValue() ) === email ) {
			return;
		}
		const saved = this.page.waitForResponse(
			( response ) =>
				response.url().includes( '/wc/store/v1/batch' ) &&
				( response.request().postData() ?? '' ).includes( `"email":"${ email }"` )
		);
		await field.fill( email );
		await field.blur();
		await this.expectSaved( await saved, 'Saving the contact email' );
	}

	/**
	 * The batch itself always answers 207 Multi-Status; each request in it
	 * carries its own status in the body. Checked after the wait, not in it,
	 * so a rejected save fails with its status instead of a timeout.
	 */
	private async expectSaved( batch: Response, what: string ): Promise< void > {
		const { responses } = ( await batch.json() ) as { responses: Array< { status: number } > };
		expect(
			responses.map( ( { status } ) => status ),
			`${ what }: statuses of the Store API batch requests`
		).toEqual( responses.map( () => 200 ) );
	}

	/**
	 * Ticks "Create an account with <store>", which the checkout offers a
	 * guest when account creation at checkout is on (`checkoutSignup`).
	 */
	async createAccount(): Promise< void > {
		await this.form.getByRole( 'checkbox', { name: /^Create an account/ } ).check();
	}

	/**
	 * Pays with Cash on delivery and places the order, then waits until the
	 * checkout has sent the browser to the order-received page.
	 */
	async placeOrder(): Promise< void > {
		await this.form.getByLabel( 'Cash on delivery' ).check();
		await this.form.getByRole( 'button', { name: 'Place order' } ).click();
		await this.page.waitForURL( /\/checkout\/order-received\// );
	}

	/**
	 * Places an order for what is in the cart with Cash on delivery, through
	 * the Store API endpoint the Checkout block posts to, and renders no page:
	 * the order-received page is left for the spec to open. The requests carry
	 * the test's cookies, so the order comes from the browser's own session.
	 * The buyer is in the store's own country and state, as on the checkout.
	 */
	async placeOrderThroughStoreApi( details: BillingDetails ): Promise< PlacedOrder > {
		// The Store API takes a write only with the nonce it hands out with the cart.
		const cart = await this.page.request.get( '/wp-json/wc/store/v1/cart' );
		expect( cart.ok(), 'Reading the cart over the Store API' ).toBe( true );
		const nonce = cart.headers().nonce;

		const address = {
			first_name: details.firstName,
			last_name: details.lastName,
			address_1: details.address,
			city: details.city,
			state: 'CA',
			postcode: details.postcode,
			country: 'US',
		};
		const response = await this.page.request.post( '/wp-json/wc/store/v1/checkout', {
			headers: { Nonce: nonce },
			data: {
				billing_address: { ...address, email: details.email },
				shipping_address: address,
				payment_method: 'cod',
			},
		} );
		const body = ( await response.json() ) as {
			order_id?: number;
			payment_result?: { redirect_url?: string };
			message?: string;
		};
		expect( response.ok(), `Placing the order over the Store API: ${ body.message ?? '' }` ).toBe( true );
		return { id: Number( body.order_id ), receivedUrl: String( body.payment_result?.redirect_url ) };
	}

	/**
	 * The amount on the order summary line labelled `label`: "Total", or a
	 * tax rate's name for its tax line.
	 */
	totalsAmount( label: string ): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- the Checkout block's totals lines have no role or label; this is WooCommerce's own class for one.
		const line = this.page.locator( '.wc-block-components-totals-item' ).filter( {
			has: this.page.getByText( label, { exact: true } ),
		} );
		// eslint-disable-next-line playwright/no-raw-locators -- the amount has no role or label of its own either.
		return line.locator( '.wc-block-components-totals-item__value' );
	}
}
