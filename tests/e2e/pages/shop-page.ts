import { ProductListing } from './product-listing';

/**
 * The shop page: every product in the store, shared by every test running at
 * the same time, so a test's own products may well be on another page of it.
 */
export class ShopPage extends ProductListing {
	async goto() {
		await this.page.goto( '/shop/' );
	}
}
