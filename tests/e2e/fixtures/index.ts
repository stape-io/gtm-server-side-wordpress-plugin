import type { Request } from '@playwright/test';
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { DataLayer } from '../data-layer/data-layer';
import { CategoryPage } from '../pages/category-page';
import { ProductPage } from '../pages/product-page';
import { findThisPlugin, getInstalledPlugins, RECREATE_ENVIRONMENT } from '../api/plugins';
import {
	createCategory,
	createProduct,
	deleteCategory,
	deleteProduct,
	type CreatedCategory,
	type CreatedProduct,
} from '../api/products';

/** Posted by the frontend script to fetch `cart_state` (see _sendStateCartDataAjax()). */
const CART_STATE_ACTION = 'action=gtm_server_side_state_cart_data';

/**
 * Whether a request belongs to the plugin: its own assets, or the admin-ajax
 * call behind `cart_state`. Other admin-ajax calls are not ours, and the sGTM /
 * loader host is not in the list: the store is configured with a placeholder
 * GTM container only.
 */
function isPluginRequest( request: Request, dir: string ): boolean {
	if ( request.url().includes( `/wp-content/plugins/${ dir }/` ) ) {
		return true;
	}
	return (
		request.url().includes( '/wp-admin/admin-ajax.php' ) &&
		( request.postData() ?? '' ).includes( CART_STATE_ACTION )
	);
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
	 * the page, or a failed request to the plugin (see isPluginRequest()). Other
	 * failed loads are the store's and the theme's business, and so are
	 * requests Chrome cancels (`net::ERR_ABORTED`) when the page navigates away.
	 */
	pageErrors: void;
};

type WorkerFixtures = {
	/**
	 * The plugin's folder under wp-content/plugins, read from the site under
	 * test: it is not always the checkout directory wp-env names it after, for
	 * example when WP_BASE_URL points at another install.
	 */
	pluginDir: string;
};

export const test = base.extend< ShopFixtures, WorkerFixtures >( {
	pluginDir: [
		async ( { requestUtils }, use ) => {
			const plugin = findThisPlugin( await getInstalledPlugins( requestUtils ) );
			if ( ! plugin ) {
				throw new Error( `This plugin is not installed on the site under test. ${ RECREATE_ENVIRONMENT }` );
			}
			await use( plugin.plugin.split( '/' )[ 0 ] );
		},
		{ scope: 'worker' },
	],
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
		async ( { page, pluginDir }, use ) => {
			const errors: string[] = [];
			page.on( 'pageerror', ( error ) => errors.push( error.message ) );
			// "Failed to load resource" lines are judged by URL below instead.
			page.on( 'console', ( message ) => {
				if ( message.type() === 'error' && ! message.text().startsWith( 'Failed to load resource' ) ) {
					errors.push( message.text() );
				}
			} );
			page.on( 'response', ( response ) => {
				if ( response.status() >= 400 && isPluginRequest( response.request(), pluginDir ) ) {
					errors.push( `${ response.status() } ${ response.url() }` );
				}
			} );
			page.on( 'requestfailed', ( request ) => {
				// Chrome cancels requests still running when the page navigates away.
				const error = request.failure()?.errorText;
				if ( error !== 'net::ERR_ABORTED' && isPluginRequest( request, pluginDir ) ) {
					errors.push( `${ error } ${ request.url() }` );
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
