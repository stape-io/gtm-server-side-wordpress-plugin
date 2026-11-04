import type { Locator, Page, Response } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

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

	/** The cart line of `product`, by the link to it the line shows. */
	item( product: CreatedProduct ): Locator {
		return this.page.getByRole( 'main' ).getByRole( 'link', { name: product.name, exact: true } );
	}

	/** The quantity field of `product`'s cart line. */
	quantity( product: CreatedProduct ): Locator {
		return this.page.getByRole( 'spinbutton', { name: `Quantity of ${ product.name } in your cart.` } );
	}

	/**
	 * Clicks the line's "+" and waits until the Store API has saved the new
	 * quantity: the block shows it at once, before the server has it. Returns
	 * the Store API's answer.
	 */
	async increaseQuantity( product: CreatedProduct ): Promise< Response > {
		const saved = this.storeApiPost();
		await this.page.getByRole( 'button', { name: `Increase quantity of ${ product.name }` } ).click();
		return saved;
	}

	/**
	 * Types a new quantity into the line's field, which the block saves on its
	 * own after a short pause, and waits until the Store API has saved it.
	 * Returns the Store API's answer.
	 */
	async setQuantity( product: CreatedProduct, quantity: number ): Promise< Response > {
		const saved = this.storeApiPost();
		await this.quantity( product ).fill( String( quantity ) );
		return saved;
	}

	/**
	 * Clicks the line's "Remove" and waits until the Store API has removed it.
	 * Returns the Store API's answer.
	 */
	async remove( product: CreatedProduct ): Promise< Response > {
		const removed = this.storeApiPost();
		await this.page.getByRole( 'button', { name: `Remove ${ product.name } from cart` } ).click();
		return removed;
	}

	/** The Store API's answer to the next change the Cart block posts. */
	private storeApiPost(): Promise< Response > {
		return this.page.waitForResponse(
			( response ) => response.request().method() === 'POST' && new URL( response.url() ).pathname.includes( '/wc/store/v1/' )
		);
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
