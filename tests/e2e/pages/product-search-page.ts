import { ProductListing } from './product-listing';

/**
 * Product search results. A search that finds a single product redirects to
 * that product's page instead, so a test that needs this page has the
 * keyword match two products or more.
 */
export class ProductSearchPage extends ProductListing {
	async goto( keyword: string ) {
		await this.page.goto( `/?${ new URLSearchParams( { s: keyword, post_type: 'product' } ) }` );
	}
}
