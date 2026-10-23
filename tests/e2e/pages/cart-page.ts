import type { Locator, Page } from '@playwright/test';

/**
 * The store's cart page, `/cart/`: the Cart block. It prices the cart over the
 * Store API and updates in place; the plugin's view_cart is printed into the
 * page when it is rendered, so only a new load reflects a change.
 */
export class CartPage {
	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/cart/' );
	}

	async reload(): Promise< void > {
		await this.page.reload();
	}

	/** The Cart block's message for a cart with nothing in it. */
	get emptyCartNotice(): Locator {
		return this.page.getByRole( 'heading', { name: 'Your cart is currently empty!' } );
	}

	/**
	 * Applies a coupon from Cart totals and waits until the cart has it: the
	 * block lists an applied coupon, with its remove button, only once the
	 * Store API has priced the cart with it.
	 */
	async applyCoupon( code: string ): Promise< void > {
		await this.page.getByRole( 'button', { name: 'Add coupons' } ).click();
		await this.page.getByLabel( 'Enter code' ).fill( code );
		await this.page.getByRole( 'button', { name: 'Apply', exact: true } ).click();
		await this.page.getByRole( 'button', { name: `Remove coupon "${ code }"` } ).waitFor();
	}

	/**
	 * The amount on the Cart totals line labelled `label`: "Estimated total",
	 * or a tax rate's name for its tax line.
	 */
	totalsAmount( label: string ): Locator {
		// eslint-disable-next-line playwright/no-raw-locators -- the Cart block's totals lines have no role or label; this is WooCommerce's own class for one.
		const line = this.page.locator( '.wc-block-components-totals-item' ).filter( {
			has: this.page.getByText( label, { exact: true } ),
		} );
		// eslint-disable-next-line playwright/no-raw-locators -- the amount has no role or label of its own either.
		return line.locator( '.wc-block-components-totals-item__value' );
	}
}
