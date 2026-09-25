import type { Page } from '@playwright/test';
import type { CreatedCategory } from '../api/products';

/**
 * Storefront category archive. Locators are keyed by product name (not SKU or
 * CSS class) so specs read the way a shopper would describe the page and stay
 * resilient to markup/theme changes.
 */
export class CategoryPage {
	constructor( private readonly page: Page ) {}

	async goto( category: CreatedCategory ) {
		await this.page.goto( category.link );
	}

	productCard( productName: string ) {
		return this.page.getByRole( 'listitem' ).filter( { hasText: productName } );
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
}
