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

	/**
	 * Clicks the line's "+" and waits until the Store API has saved the new
	 * quantity: the drawer shows it at once, before the server has it.
	 */
	async increaseQuantity( product: CreatedProduct ): Promise< void > {
		const saved = this.cartChanged();
		await this.drawer().getByRole( 'button', { name: `Increase quantity of ${ product.name }` } ).click();
		await saved;
	}

	/** Clicks the line's "-" and waits until the Store API has saved the new quantity. */
	async decreaseQuantity( product: CreatedProduct ): Promise< void > {
		const saved = this.cartChanged();
		await this.drawer().getByRole( 'button', { name: `Reduce quantity of ${ product.name }` } ).click();
		await saved;
	}

	/**
	 * Types a new quantity into the line's field and leaves it, on which the
	 * drawer saves it, and waits until the Store API has.
	 */
	async setQuantity( product: CreatedProduct, quantity: number ): Promise< void > {
		const saved = this.cartChanged();
		const field = this.drawer().getByRole( 'spinbutton', { name: `Quantity of ${ product.name } in your cart.` } );
		await field.fill( String( quantity ) );
		await field.blur();
		await saved;
	}

	/** Clicks the line's "Remove" and waits until the line is gone. */
	async remove( product: CreatedProduct ): Promise< void > {
		await this.drawer().getByRole( 'button', { name: `Remove ${ product.name } from cart` } ).click();
		await this.item( product ).waitFor( { state: 'detached' } );
	}

	private drawer(): Locator {
		return this.page.getByRole( 'dialog' );
	}

	/** The Store API's answer to a change the drawer posts, which it sends as a batch. */
	private cartChanged(): Promise< Response > {
		return this.page.waitForResponse(
			( response ) => response.request().method() === 'POST' && new URL( response.url() ).pathname.endsWith( '/wc/store/v1/batch' )
		);
	}
}
