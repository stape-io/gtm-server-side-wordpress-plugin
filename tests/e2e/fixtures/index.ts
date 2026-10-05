import path from 'node:path';
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

/** The plugin's folder under wp-content/plugins: wp-env names it after the checkout directory. */
const PLUGIN_DIR = path.basename( path.resolve( __dirname, '../../..' ) );

/**
 * Whether a request belongs to the plugin: its own assets, or the admin-ajax
 * call behind `cart_state`. The sGTM / loader host is not in the list: the
 * store is configured with a placeholder GTM container only.
 */
function isPluginUrl( url: string ): boolean {
	return url.includes( `/wp-content/plugins/${ PLUGIN_DIR }/` ) || url.includes( '/wp-admin/admin-ajax.php' );
}

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
	 * Automatic: fails the test on an uncaught JS error, a `console.error` from
	 * the page, or a failed request to the plugin (see isPluginUrl()). Other
	 * failed loads are the store's and the theme's business.
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
			// "Failed to load resource" lines are judged by URL below instead.
			page.on( 'console', ( message ) => {
				if ( message.type() === 'error' && ! message.text().startsWith( 'Failed to load resource' ) ) {
					errors.push( message.text() );
				}
			} );
			page.on( 'response', ( response ) => {
				if ( response.status() >= 400 && isPluginUrl( response.url() ) ) {
					errors.push( `${ response.status() } ${ response.url() }` );
				}
			} );
			page.on( 'requestfailed', ( request ) => {
				if ( isPluginUrl( request.url() ) ) {
					errors.push( `${ request.failure()?.errorText } ${ request.url() }` );
				}
			} );
			await use();
			expect( errors, 'JS errors and failed plugin requests on the page' ).toEqual( [] );
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
