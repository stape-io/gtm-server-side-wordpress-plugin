import type { Locator, Page } from '@playwright/test';

/** The page the checkout lands on once an order is placed: `/checkout/order-received/<id>/`. */
export class OrderReceivedPage {
	constructor( private readonly page: Page ) {}

	/** The Order Confirmation block's title, shown once the order is found. */
	get heading(): Locator {
		return this.page.getByRole( 'heading', { name: 'Order received' } );
	}
}
