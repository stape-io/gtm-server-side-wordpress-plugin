import type { Page } from '@playwright/test';

/** The shop's sort options, as the sort select sends them. */
export type CatalogOrderby = 'menu_order' | 'popularity' | 'rating' | 'date' | 'price' | 'price-desc';

/**
 * What every storefront page with a product grid has in common: category and
 * tag archives, the shop, search results. Locators are keyed by product name
 * (not SKU or CSS class) so specs read the way a shopper would describe the
 * page and stay resilient to markup/theme changes.
 */
export class ProductListing {
	constructor( protected readonly page: Page ) {}

	productCard( productName: string ) {
		return this.page.getByRole( 'main' ).getByRole( 'listitem' ).filter( { hasText: productName } );
	}

	addToCartButton( productName: string ) {
		return this.productCard( productName ).getByRole( 'button', { name: /add to cart/i } );
	}

	/**
	 * Clicks "Add to cart", and nothing more. Deliberately waits on no specific
	 * endpoint: the block Product Collection grid sends the cart mutation to
	 * POST wc/store/v1/batch, classic themes to wc-ajax=add_to_cart, and the
	 * page object is what absorbs a theme change. Specs wait on the dataLayer
	 * event instead (DataLayer.expectPushedOnce()).
	 */
	async addToCart( productName: string ): Promise< void > {
		await this.addToCartButton( productName ).click();
	}

	/**
	 * Clicks "Add to cart" and waits until the card shows the product was
	 * added: its "View cart" link, which the block grid adds once the cart
	 * request has landed.
	 */
	async addToCartUntilAdded( productName: string ): Promise< void > {
		await this.addToCart( productName );
		await this.productCard( productName ).getByRole( 'link', { name: 'View cart' } ).waitFor();
	}

	/**
	 * Follows a product's "Add to cart" when it is a plain `?add-to-cart=`
	 * link (AJAX add to cart off), and waits for the page it loads.
	 */
	async followAddToCartLink( productName: string ): Promise< void > {
		await this.productCard( productName ).getByRole( 'link', { name: /add to cart/i } ).click();
		await this.page.waitForURL( /[?&]add-to-cart=\d+/ );
	}

	/**
	 * The names of the products in the grid, in the order it shows them. The
	 * grid is rendered server-side, so it is complete once goto() returns.
	 */
	async productNames(): Promise< string[] > {
		const titles = this.page
			.getByRole( 'main' )
			.getByRole( 'listitem' )
			.getByRole( 'heading', { level: 2 } );
		return ( await titles.allTextContents() ).map( ( name ) => name.trim() );
	}
}
