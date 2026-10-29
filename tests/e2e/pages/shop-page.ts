import { expect } from '@playwright/test';
import type { CreatedProduct } from '../api/products';
import { ProductListing, type CatalogOrderby } from './product-listing';

/**
 * The shop page: every product in the store, shared by every test running at
 * the same time, so a test's own products may well be on another page of it.
 */
export class ShopPage extends ProductListing {
	/** `orderby` is the shop's sort, as the sort select sends it (`date`: newest first). */
	async goto( { orderby }: { orderby?: CatalogOrderby } = {} ) {
		await this.page.goto( orderby ? `/shop/?${ new URLSearchParams( { orderby } ) }` : '/shop/' );
	}

	/** The path and query the browser is on now. */
	path(): string {
		const url = new URL( this.page.url() );
		return url.pathname + url.search;
	}

	/** Opens the shop through an `?add-to-cart=` link, which adds `product` on the way. */
	async gotoAddingToCart( product: CreatedProduct ) {
		await this.page.goto( `/shop/?add-to-cart=${ product.id }` );
	}

	/**
	 * Adds `product` the way an `?add-to-cart=` link does, from this browser's
	 * session but without rendering a page: with `cartRedirectAfterAdd` on,
	 * WooCommerce answers the add with a redirect, which is not followed.
	 */
	async addToCartWithoutRendering( product: CreatedProduct ): Promise< void > {
		const response = await this.page.request.get( `/?add-to-cart=${ product.id }`, { maxRedirects: 0 } );
		expect( response.status(), 'The add rendered a page instead of redirecting: is cartRedirectAfterAdd on?' ).toBe( 302 );
	}
}
