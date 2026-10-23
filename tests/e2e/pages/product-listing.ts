import type { Page } from '@playwright/test';

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
