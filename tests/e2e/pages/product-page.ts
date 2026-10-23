import type { Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** The part of jQuery the page's console steps use; the store loads jQuery on product pages. */
type JQueryWindow = {
	jQuery: ( target: string | HTMLElement ) => {
		on: ( event: string, handler: ( e: Event ) => void ) => void;
		trigger: ( event: string ) => void;
	};
};

/** Single product page. */
export class ProductPage {
	constructor( private readonly page: Page ) {}

	async goto( product: CreatedProduct ) {
		await this.page.goto( product.permalink );
	}

	/**
	 * Submits the product form, which posts and reloads the page, and waits for
	 * WooCommerce's "added to your cart" notice (an alert) on the reloaded
	 * page. The form, not a grid button: related products on the same page
	 * have their own.
	 */
	async addToCart(): Promise< void > {
		await this.clickAddToCart();
		await this.page.getByRole( 'alert' ).filter( { hasText: /has been added to your cart/i } ).waitFor();
	}

	/**
	 * Clicks "Add to cart" in the product form, and nothing more. With the
	 * submit held (holdFormSubmit()) no page loads and no notice comes: what
	 * the click did is in the dataLayer, which the spec checks.
	 */
	async clickAddToCart(): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- form.cart is WooCommerce core markup; the form has no accessible name.
		await this.page.locator( 'form.cart' ).getByRole( 'button', { name: /add to cart/i } ).click();
	}

	async setQuantity( quantity: number ): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- form.cart is WooCommerce core markup; the form has no accessible name.
		await this.page.locator( 'form.cart' ).getByLabel( 'Product quantity' ).fill( String( quantity ) );
	}

	/**
	 * Stops the product form from submitting, as a theme or plugin that adds
	 * to the cart over its own AJAX does: the click handlers still run, but no
	 * page load follows.
	 */
	async holdFormSubmit(): Promise< void > {
		await this.page.evaluate( () => {
			( window as unknown as JQueryWindow ).jQuery( 'form.cart' ).on( 'submit', ( e ) => e.preventDefault() );
		} );
	}

	/** Triggers `added_to_cart` on the body, as such a theme does once its AJAX add has landed. */
	async triggerAddedToCart(): Promise< void > {
		await this.page.evaluate( () => {
			( window as unknown as JQueryWindow ).jQuery( document.body ).trigger( 'added_to_cart' );
		} );
	}
}
