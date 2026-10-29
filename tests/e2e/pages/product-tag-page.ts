import type { CreatedTag } from '../api/products';
import { ProductListing } from './product-listing';

/** Storefront product tag archive. */
export class ProductTagPage extends ProductListing {
	async goto( tag: CreatedTag ) {
		await this.page.goto( tag.link );
	}
}
