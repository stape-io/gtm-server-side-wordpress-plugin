import { randomUUID } from 'node:crypto';
import type { APIResponse, Request } from '@playwright/test';
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { DataLayer } from '../data-layer/data-layer';
import { CategoryPage } from '../pages/category-page';
import { CheckoutPage } from '../pages/checkout-page';
import { ClassicCartPage } from '../pages/classic-cart-page';
import { HomePage } from '../pages/home-page';
import { CART_STATE_ACTION, ClassicLoopPage } from '../pages/classic-loop-page';
import { ProductPage } from '../pages/product-page';
import { ProductSearchPage } from '../pages/product-search-page';
import { ProductTagPage } from '../pages/product-tag-page';
import { ShopPage } from '../pages/shop-page';
import { findThisPlugin, getInstalledPlugins, RECREATE_ENVIRONMENT } from '../api/plugins';
import {
	createCategory,
	createProduct,
	createTag,
	deleteCategory,
	deleteProduct,
	deleteTag,
	type CreatedCategory,
	type CreatedProduct,
	type CreatedTag,
	type ProductOptions,
} from '../api/products';
import { createClassicCartPage, createClassicLoopPage, deletePage, type CreatedPage } from '../api/pages';
import { buildGuestBuyer, type BillingDetails } from '../api/customers';
import { STORE_OPTIONS_COOKIE, storeOptionsCookieValue, type StoreOptions } from './store-options';

/** Read by mu-plugins/record-php-errors.php; the PHP side names it GTM_SERVER_SIDE_E2E_PHP_ERRORS_COOKIE. */
const PHP_ERRORS_COOKIE = 'gtm_e2e_php_errors';

/**
 * Whether a request belongs to the plugin: its own assets, or the admin-ajax
 * call behind `cart_state`. Other admin-ajax calls are not ours, and the sGTM /
 * loader host is not in the list: the store is configured with a placeholder
 * GTM container only.
 */
function isPluginRequest( request: Request, dir: string ): boolean {
	if ( request.url().includes( `/plugins/${ dir }/` ) ) {
		return true;
	}
	return (
		request.url().includes( '/wp-admin/admin-ajax.php' ) &&
		( request.postData() ?? '' ).includes( `action=${ CART_STATE_ACTION }` )
	);
}

/**
 * Whether a script belongs to the plugin: one of its files, or an inline
 * script, which is what the plugin prints into the page for its server-side
 * events. An inline script reports the page itself as its source.
 */
function isPluginScript( url: string, dir: string, pageUrl: string ): boolean {
	return url.includes( `/plugins/${ dir }/` ) || url === pageUrl;
}

/** The script URLs in an error's stack, in both Chrome stack-line formats. */
function stackUrls( stack: string | undefined ): string[] {
	return [ ...( stack ?? '' ).matchAll( /(https?:\/\/[^\s()]+?):\d+:\d+/g ) ].map( ( match ) => match[ 1 ] );
}

/**
 * Creates content for one test, and deletes it after the test, newest first:
 * a grouped product before the products it links, a subcategory before its
 * parent, a product before its tag.
 */
type Catalog = {
	/** A throwaway category; with `parent`, a subcategory of it. */
	createCategory: ( parent?: CreatedCategory ) => Promise< CreatedCategory >;
	/** A throwaway product tag. */
	createTag: () => Promise< CreatedTag >;
	/** A throwaway product in `category` only (see ProductOptions). */
	createProduct: ( category: CreatedCategory, options?: ProductOptions ) => Promise< CreatedProduct >;
	/** A throwaway page with the classic product loop (`[products]`) of `category`. */
	createClassicLoopPage: ( category: CreatedCategory ) => Promise< CreatedPage >;
	/** A throwaway page with the classic cart (`[woocommerce_cart]`). */
	createClassicCartPage: () => Promise< CreatedPage >;
};

type PhpErrors = {
	/**
	 * Asserts PHP reported no warning, notice or fatal error while serving
	 * this test's browser requests so far. Call it last, once the requests the
	 * case checks have been answered.
	 */
	expectNone: () => Promise< void >;
};

type SameOriginProxy = {
	/** GETs a path on this site, expecting the proxy to answer it with a 200. */
	get: ( path: string ) => Promise< APIResponse >;
};

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
	checkoutPage: CheckoutPage;
	classicLoopPage: ClassicLoopPage;
	classicCartPage: ClassicCartPage;
	homePage: HomePage;
	shopPage: ShopPage;
	productTagPage: ProductTagPage;
	productSearchPage: ProductSearchPage;
	/**
	 * Overrides store settings for this test's browser only (see
	 * ./store-options.ts). Call it before the first page load; a later call
	 * adds to the earlier ones.
	 */
	storeOptions: ( options: StoreOptions ) => Promise< void >;
	/**
	 * Requests through the same-origin proxy, from this test's browser context
	 * so they carry its storeOptions() cookie (the standalone `request` fixture
	 * doesn't). Redirects are not followed, so a canonical redirect can't hide
	 * what the proxy did, and anything but a 200 fails the test.
	 */
	sameOriginProxy: SameOriginProxy;
	/**
	 * What PHP reported while serving this test's browser requests, recorded
	 * by mu-plugins/record-php-errors.php: debug.log is shared by every test
	 * running at the same time. Starts recording before the first page load.
	 */
	phpErrors: PhpErrors;
	/** Billing details for a guest checkout, unique to this test. */
	guestBuyer: BillingDetails;
	/**
	 * Content the named fixtures below don't cover: variable and grouped
	 * products, subcategories, tags, sets of products. Deleted after the test.
	 */
	catalog: Catalog;
	/** A throwaway product category, created before the test and deleted after. */
	category: CreatedCategory;
	/** A throwaway simple product in `category` at 20.00, created before the test and deleted after. */
	product: CreatedProduct;
	/** A throwaway simple product in `category`, regular 50.00 and on sale at 35.00. */
	saleProduct: CreatedProduct;
	/**
	 * Automatic: answers requests for gtm.js with an empty script. The store is
	 * configured with a placeholder container, so the real one would only add
	 * a network dependency and a third-party script writing to the same
	 * window.dataLayer the specs assert on.
	 */
	stubGtm: void;
	/**
	 * Automatic: fails the test on an uncaught JS error or a `console.error`
	 * raised by the plugin's scripts (see isPluginScript()), or a failed request
	 * to the plugin (see isPluginRequest()). Errors from WooCommerce, the theme
	 * and other plugins don't count. Other failed loads are the store's and the
	 * theme's business, and so are requests Chrome cancels (`net::ERR_ABORTED`)
	 * when the page navigates away.
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
			// Only errors from the plugin's own scripts count: WooCommerce, the
			// theme and other plugins log their own (SCRIPT_DEBUG makes React
			// warn through console.error), and they change with every release.
			page.on( 'pageerror', ( error ) => {
				if ( stackUrls( error.stack ).some( ( url ) => isPluginScript( url, pluginDir, page.url() ) ) ) {
					errors.push( error.message );
				}
			} );
			// "Failed to load resource" lines are judged by URL below instead.
			page.on( 'console', ( message ) => {
				if (
					message.type() === 'error' &&
					! message.text().startsWith( 'Failed to load resource' ) &&
					isPluginScript( message.location().url, pluginDir, page.url() )
				) {
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
	checkoutPage: async ( { page }, use ) => {
		await use( new CheckoutPage( page ) );
	},
	classicLoopPage: async ( { page }, use ) => {
		await use( new ClassicLoopPage( page ) );
	},
	classicCartPage: async ( { page }, use ) => {
		await use( new ClassicCartPage( page ) );
	},
	homePage: async ( { page }, use ) => {
		await use( new HomePage( page ) );
	},
	shopPage: async ( { page }, use ) => {
		await use( new ShopPage( page ) );
	},
	productTagPage: async ( { page }, use ) => {
		await use( new ProductTagPage( page ) );
	},
	productSearchPage: async ( { page }, use ) => {
		await use( new ProductSearchPage( page ) );
	},
	storeOptions: async ( { page, baseURL }, use ) => {
		let options: StoreOptions = {};
		await use( async ( more ) => {
			options = { ...options, ...more };
			await page.context().addCookies( [
				{ name: STORE_OPTIONS_COOKIE, value: storeOptionsCookieValue( options ), url: baseURL },
			] );
		} );
	},
	sameOriginProxy: async ( { page }, use ) => {
		await use( {
			get: async ( path ) => {
				const response = await page.request.get( path, { maxRedirects: 0 } );
				expect(
					response.status(),
					`${ path } did not reach the proxy's upstream. Is same-origin set up, and did the test supply sameOriginApiKey? ${ RECREATE_ENVIRONMENT }`
				).toBe( 200 );
				return response;
			},
		} );
	},
	phpErrors: async ( { page, baseURL, requestUtils }, use ) => {
		const token = randomUUID();
		const path = `/gtm-e2e/v1/php-errors/${ token }`;
		await page.context().addCookies( [ { name: PHP_ERRORS_COOKIE, value: token, url: baseURL } ] );
		const call = async ( method: 'GET' | 'DELETE' ): Promise< string[] > => {
			try {
				return await requestUtils.rest( { path, method } );
			} catch ( error ) {
				throw new Error(
					`Cannot read the PHP errors this test recorded: is mu-plugins/record-php-errors.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start. ${ String( error ) }`
				);
			}
		};
		await use( {
			expectNone: async () => {
				expect( await call( 'GET' ), "PHP warnings, notices or fatal errors on this test's requests" ).toEqual( [] );
			},
		} );
		await call( 'DELETE' );
	},
	guestBuyer: async ( {}, use ) => {
		await use( buildGuestBuyer() );
	},
	catalog: async ( { requestUtils }, use ) => {
		const deletions: Array< () => Promise< void > > = [];
		await use( {
			createCategory: async ( parent ) => {
				const created = await createCategory( requestUtils, parent );
				deletions.push( () => deleteCategory( requestUtils, created.id ) );
				return created;
			},
			createTag: async () => {
				const created = await createTag( requestUtils );
				deletions.push( () => deleteTag( requestUtils, created.id ) );
				return created;
			},
			createProduct: async ( category, options ) => {
				const created = await createProduct( requestUtils, category, options );
				deletions.push( () => deleteProduct( requestUtils, created.id ) );
				return created;
			},
			createClassicLoopPage: async ( category ) => {
				const created = await createClassicLoopPage( requestUtils, category );
				deletions.push( () => deletePage( requestUtils, created.id ) );
				return created;
			},
			createClassicCartPage: async () => {
				const created = await createClassicCartPage( requestUtils );
				deletions.push( () => deletePage( requestUtils, created.id ) );
				return created;
			},
		} );
		// One at a time, newest first: what was created later may depend on
		// what came before it. A failed deletion doesn't stop the rest; the
		// first error is rethrown once they have all run.
		const errors: unknown[] = [];
		for ( const deletion of deletions.reverse() ) {
			await deletion().catch( ( error: unknown ) => errors.push( error ) );
		}
		if ( errors.length ) {
			throw errors[ 0 ];
		}
	},
	category: async ( { catalog }, use ) => {
		await use( await catalog.createCategory() );
	},
	product: async ( { catalog, category }, use ) => {
		await use( await catalog.createProduct( category ) );
	},
	saleProduct: async ( { catalog, category }, use ) => {
		await use( await catalog.createProduct( category, { regular_price: '50.00', sale_price: '35.00' } ) );
	},
} );

export { expect };
