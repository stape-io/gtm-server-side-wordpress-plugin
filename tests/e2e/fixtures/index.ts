import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { waitForDataLayerEvent } from '../utils/data-layer';
import type { DataLayerEvent } from '../types/data-layer';
import { ShopPage } from '../pages/shop-page';
import { createProduct, deleteProduct, type CreatedProduct } from '../api/products';

/**
 * Base test: @wordpress/e2e-test-utils-playwright's `test`, which already
 * carries the `admin`, `editor`, `pageUtils` and `requestUtils` fixtures
 * (see https://developer.wordpress.org/news/2026/05/getting-started-writing-wordpress-e2e-tests-with-playwright/).
 * None of those log the browser `page` itself into wp-admin - `admin.*`
 * helpers handle auth on demand - so storefront specs stay anonymous by
 * default, and future admin-context specs (settings, order status changes
 * for the webhook layer) can request `admin`/`requestUtils` without a
 * separate fixture set.
 */
type ShopFixtures = {
	dataLayer: {
		/** Waits for the event to appear, then returns it. Throws on timeout. */
		waitFor: ( eventName: string, timeout?: number ) => Promise< DataLayerEvent >;
	};
	shopPage: ShopPage;
	/**
	 * A throwaway WooCommerce simple product, created via the REST API
	 * before the test and deleted after - see api/products.ts.
	 */
	product: CreatedProduct;
};

export const test = base.extend< ShopFixtures >( {
	dataLayer: async ( { page }, use ) => {
		await use( {
			waitFor: ( eventName: string, timeout?: number ) =>
				waitForDataLayerEvent( page, eventName, timeout ),
		} );
	},
	shopPage: async ( { page }, use ) => {
		await use( new ShopPage( page ) );
	},
	product: async ( { requestUtils }, use ) => {
		const created = await createProduct( requestUtils );
		await use( created );
		await deleteProduct( requestUtils, created.id );
	},
} );

export { expect };
