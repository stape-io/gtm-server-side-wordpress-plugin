import type { CreatedCategory } from '../api/products';
import { ProductListing, type CatalogOrderby } from './product-listing';

/** Storefront category archive. */
export class CategoryPage extends ProductListing {
	/**
	 * `orderby` is the shop's sort (`price-desc`, …), `pageNumber` a page of
	 * the paginated grid, the way a shopper reaches them from the sort select
	 * and the pagination links.
	 */
	async goto( category: CreatedCategory, { orderby, pageNumber }: { orderby?: CatalogOrderby; pageNumber?: number } = {} ) {
		const url = new URL( pageNumber && pageNumber > 1 ? `page/${ pageNumber }/` : '', category.link );
		if ( orderby ) {
			url.searchParams.set( 'orderby', orderby );
		}
		await this.page.goto( url.toString() );
	}
}
