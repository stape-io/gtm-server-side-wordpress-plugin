import { expect, type Locator, type Page, type Response } from '@playwright/test';
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
	/** The page goto() opened, as the server sent it. */
	private landing: Response | null = null;

	constructor( private readonly page: Page ) {}

	/** The add-to-cart form, not a grid button: related products on the same page have their own. */
	private form() {
		// eslint-disable-next-line playwright/no-raw-locators -- form.cart is WooCommerce core markup; the form has no accessible name.
		return this.page.locator( 'form.cart' );
	}

	async goto( product: CreatedProduct ) {
		this.landing = await this.page.goto( product.permalink );
	}

	/** The HTML of the page goto() opened, as View Source shows it: before any script ran. */
	async source(): Promise< string > {
		if ( ! this.landing ) {
			throw new Error( 'Call goto() first: source() is the HTML of the page it opens.' );
		}
		return this.landing.text();
	}

	/** The product's name as the page's title. */
	title( product: CreatedProduct ): Locator {
		return this.page.getByRole( 'heading', { level: 1, name: product.name, exact: true } );
	}

	/**
	 * Submits the product form, which posts and reloads the page, and waits for
	 * WooCommerce's "added to your cart" notice (an alert) on the reloaded
	 * page: "has been added" for one item, "have been added" for several (a
	 * quantity above 1, a grouped product's children).
	 */
	async addToCart(): Promise< void > {
		await this.clickAddToCart();
		await this.page.getByRole( 'alert' ).filter( { hasText: /(has|have) been added to your cart/i } ).waitFor();
	}

	/**
	 * Clicks "Add to cart" in the product form, and nothing more. With the
	 * submit held (holdFormSubmit()) no page loads and no notice comes: what
	 * the click did is in the dataLayer, which the spec checks.
	 */
	async clickAddToCart(): Promise< void > {
		await this.form().getByRole( 'button', { name: /add to cart/i } ).click();
	}

	/**
	 * Chooses a value for each of a variable product's attributes, by label,
	 * and waits until WooCommerce lets the choice be added. Until then "Add to
	 * cart" is styled disabled and only alerts that an option is missing, and
	 * that lasts a moment after the variation is matched: the button is
	 * enabled once the variation's details have been shown.
	 */
	async chooseOptions( options: Record< string, string > ): Promise< void > {
		const form = this.form();
		for ( const [ attribute, value ] of Object.entries( options ) ) {
			await form.getByLabel( attribute ).selectOption( value );
		}
		// The class, not the disabled attribute: WooCommerce's variation script only toggles the class.
		await expect( form.getByRole( 'button', { name: /add to cart/i } ) ).not.toHaveClass( /\bdisabled\b/ );
	}

	/**
	 * Sets the quantity of one child of a grouped product. Every child's field
	 * is named "Product quantity", so the row is found by the child's link.
	 */
	async setGroupedQuantity( child: CreatedProduct, quantity: number ): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- the children are rows of WooCommerce core's grouped table, which has role=presentation and so no rows to find by role.
		const rows = this.form().locator( 'tr.woocommerce-grouped-product-list-item' );
		await rows
			.filter( { has: this.page.getByRole( 'link', { name: child.name, exact: true } ) } )
			.getByRole( 'spinbutton', { name: 'Product quantity' } )
			.fill( String( quantity ) );
	}

	async setQuantity( quantity: number ): Promise< void > {
		await this.form().getByLabel( 'Product quantity' ).fill( String( quantity ) );
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
