import { expect, type Locator, type Page } from '@playwright/test';

/** The page the checkout lands on once an order is placed: `/checkout/order-received/<id>/`. */
export class OrderReceivedPage {
	constructor( private readonly page: Page ) {}

	/** `url` is the order's own order-received URL, order key included. */
	async goto( url: string ): Promise< void > {
		await this.page.goto( url );
	}

	/** The URL the browser is on: the order's own order-received URL, order key included. */
	url(): string {
		return this.page.url();
	}

	async reload(): Promise< void > {
		await this.page.reload();
	}

	/** The Order Confirmation block's title, shown once the order is found. */
	get heading(): Locator {
		return this.page.getByRole( 'heading', { name: 'Order received' } );
	}

	/** The title the Order Confirmation block shows for a failed order instead. */
	get failedHeading(): Locator {
		return this.page.getByRole( 'heading', { name: 'Order failed' } );
	}

	/** The title the Order Confirmation block shows for a cancelled order instead. */
	get cancelledHeading(): Locator {
		return this.page.getByRole( 'heading', { name: 'Order cancelled' } );
	}

	/** The order number the page shows ("Order #: 123"). */
	async orderNumber(): Promise< string > {
		const summary = this.page.getByRole( 'listitem' ).filter( { hasText: /^Order #:/ } );
		await expect( summary ).toBeVisible();
		const match = /Order #:\s*(\S+)/.exec( await summary.innerText() );
		if ( ! match ) {
			throw new Error( 'The order-received page shows no order number.' );
		}
		return match[ 1 ];
	}

	/** The button of the form WooCommerce shows a new session instead of a guest's order once its grace period is over. */
	get emailVerificationButton(): Locator {
		return this.page.getByRole( 'button', { name: 'Confirm email and view order' } );
	}

	/** Answers that form with the order's email, and waits for the order. */
	async verifyEmail( email: string ): Promise< void > {
		await this.page.getByRole( 'textbox', { name: 'Email address' } ).fill( email );
		await this.emailVerificationButton.click();
		await expect( this.heading ).toBeVisible();
	}
}
