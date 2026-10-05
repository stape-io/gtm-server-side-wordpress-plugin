import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { DataLayer } from '../data-layer/data-layer';
import { CategoryPage } from '../pages/category-page';
import { ProductPage } from '../pages/product-page';
import {
	createCategory,
	createProduct,
	deleteCategory,
	deleteProduct,
	type CreatedCategory,
	type CreatedProduct,
} from '../api/products';

/**
 * Base test: @wordpress/e2e-test-utils-playwright's `test`, which already
 * carries the `admin`, `editor`, `pageUtils` and `requestUtils` fixtures.
 * None of those log the browser `page` itself into wp-admin, so storefront
 * specs stay anonymous by default.
 */
type ShopFixtures = {
	dataLayer: DataLayer;
	categoryPage: CategoryPage;
	productPage: ProductPage;
	/** A throwaway product category, created before the test and deleted after. */
	category: CreatedCategory;
	/** A throwaway simple product in `category`, created before the test and deleted after. */
	product: CreatedProduct;
	/**
	 * Automatic: answers requests for gtm.js with an empty script. The store is
	 * configured with a placeholder container, so the real one would only add
	 * a network dependency and a third-party script writing to the same
	 * window.dataLayer the specs assert on.
	 */
	stubGtm: void;
	/**
	 * Automatic: fails the test on an uncaught JS error or a `console.error`
	 * from the page. Failed resource loads are left out: they are the store's
	 * and the theme's business, not the plugin's script.
	 */
	pageErrors: void;
};

export const test = base.extend< ShopFixtures >( {
	stubGtm: [
		async ( { page }, use ) => {
			await page.route( 'https://www.googletagmanager.com/**', ( route ) =>
				route.fulfill( { status: 200, contentType: 'text/javascript', body: '' } )
			);
			await use();
		},
		{ auto: true },
	],
	pageErrors: [
		async ( { page }, use ) => {
			const errors: string[] = [];
			page.on( 'pageerror', ( error ) => errors.push( error.message ) );
			page.on( 'console', ( message ) => {
				if ( message.type() === 'error' && ! message.text().startsWith( 'Failed to load resource' ) ) {
					errors.push( message.text() );
				}
			} );
			await use();
			expect( errors, 'JS errors on the page' ).toEqual( [] );
		},
		{ auto: true },
	],
	dataLayer: async ( { page }, use ) => {
		await use( new DataLayer( page ) );
	},
	categoryPage: async ( { page }, use ) => {
		await use( new CategoryPage( page ) );
	},
	productPage: async ( { page }, use ) => {
		await use( new ProductPage( page ) );
	},
	category: async ( { requestUtils }, use ) => {
		const created = await createCategory( requestUtils );
		await use( created );
		await deleteCategory( requestUtils, created.id );
	},
	product: async ( { requestUtils, category }, use ) => {
		const created = await createProduct( requestUtils, category );
		await use( created );
		await deleteProduct( requestUtils, created.id );
	},
} );

export { expect };
