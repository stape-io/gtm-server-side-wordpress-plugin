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
}
