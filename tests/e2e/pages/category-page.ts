import type { CreatedCategory } from '../api/products';
import { ProductListing } from './product-listing';

/** The shop's sort options, as the sort select sends them. */
type CatalogOrderby = 'menu_order' | 'popularity' | 'rating' | 'date' | 'price' | 'price-desc';

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
