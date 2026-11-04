import type { Locator, Page, Response } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/**
 * The header's Mini-Cart block: a button with the number of items that opens
 * a drawer with the cart's lines. Its controls are named like the Cart
 * block's, so every locator is scoped to the drawer. WooCommerce renders no
 * Mini-Cart on the cart and checkout pages.
 */
export class MiniCart {
	constructor( private readonly page: Page ) {}

	/** Opens the drawer and waits for it. */
	async open(): Promise< void > {
		await this.page.getByRole( 'button', { name: /items? in the cart/i } ).click();
		await this.drawer().waitFor();
	}

	/** The cart line of `product` in the drawer, by the link to it the line shows. */
	item( product: CreatedProduct ): Locator {
		return this.drawer().getByRole( 'link', { name: product.name, exact: true } );
	}

	/** The quantity field of `product`'s line in the drawer. */
	quantity( product: CreatedProduct ): Locator {
		return this.drawer().getByRole( 'spinbutton', { name: `Quantity of ${ product.name } in your cart.` } );
	}

	/** The drawer's message for a cart with nothing in it. */
	get emptyCartNotice(): Locator {
		return this.drawer().getByText( 'Your cart is currently empty!' );
	}

	/**
	 * Clicks the line's "+" and waits until the Store API has saved the new
	 * quantity: the drawer shows it at once, before the server has it.
	 * Returns the Store API's answer.
	 */
	async increaseQuantity( product: CreatedProduct ): Promise< Response > {
		const saved = this.storeApiPost();
		await this.drawer().getByRole( 'button', { name: `Increase quantity of ${ product.name }` } ).click();
		return saved;
	}

	/**
	 * Types a new quantity into the line's field and leaves it, on which the
	 * drawer saves it, and waits until the Store API has. Returns the Store
	 * API's answer.
	 */
	async setQuantity( product: CreatedProduct, quantity: number ): Promise< Response > {
		const saved = this.storeApiPost();
		await this.quantity( product ).fill( String( quantity ) );
		await this.quantity( product ).blur();
		return saved;
	}

	/**
	 * Clicks the line's "Remove" and waits until the Store API has removed it.
	 * Returns the Store API's answer.
	 */
	async remove( product: CreatedProduct ): Promise< Response > {
		const removed = this.storeApiPost();
		await this.drawer().getByRole( 'button', { name: `Remove ${ product.name } from cart` } ).click();
		return removed;
	}

	private drawer(): Locator {
		return this.page.getByRole( 'dialog' );
	}

	/** The Store API's answer to the next change the drawer posts. */
	private storeApiPost(): Promise< Response > {
		return this.page.waitForResponse(
			( response ) => response.request().method() === 'POST' && new URL( response.url() ).pathname.includes( '/wc/store/v1/' )
		);
	}
}
