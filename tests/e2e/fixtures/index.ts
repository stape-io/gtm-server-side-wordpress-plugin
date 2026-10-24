import { randomUUID } from 'node:crypto';
import type { APIResponse, Request } from '@playwright/test';
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { DataLayer } from '../data-layer/data-layer';
import { AdminNewOrderPage } from '../pages/admin-new-order-page';
import { CartPage } from '../pages/cart-page';
import { CategoryPage } from '../pages/category-page';
import { CheckoutPage } from '../pages/checkout-page';
import { ClassicCartPage } from '../pages/classic-cart-page';
import { ContentPage } from '../pages/content-page';
import { HomePage } from '../pages/home-page';
import { MyAccountPage } from '../pages/my-account-page';
import { CART_STATE_ACTION, ClassicLoopPage } from '../pages/classic-loop-page';
import { OrderReceivedPage } from '../pages/order-received-page';
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
	updateProduct,
	type CreatedCategory,
	type CreatedProduct,
	type CreatedTag,
	type ProductChanges,
	type ProductOptions,
} from '../api/products';
import { createClassicCartPage, createClassicLoopPage, createPage, deletePage, type CreatedPage } from '../api/pages';
import {
	buildGuestBuyer,
	buildNewCustomer,
	deleteAccountsOf,
	type BillingDetails,
	type NewCustomer,
} from '../api/customers';
import { deleteOrder, deleteOrdersOf, setOrderStatus } from '../api/orders';
import { createCoupon, deleteCoupon, type CreatedCoupon } from '../api/coupons';
import { createTaxRate, deleteTaxRate, type CreatedTaxRate, type TaxRateOptions } from '../api/taxes';
import { STORE_OPTIONS_COOKIE, storeOptionsCookieValue, type StoreOptions } from './store-options';

/** Read by mu-plugins/record-php-errors.php; the PHP side names it GTM_SERVER_SIDE_E2E_PHP_ERRORS_COOKIE. */
const PHP_ERRORS_COOKIE = 'gtm_e2e_php_errors';

/** Read by the test plugins in mu-plugins/ behind the testPlugins fixture; each names its own on the PHP side. */
const FLAT_RATE_COOKIE = 'gtm_e2e_flat_rate';
const CONFIRMATION_PAGE_COOKIE = 'gtm_e2e_order_confirmation_page';
const NO_EMAIL_VERIFICATION_GRACE_COOKIE = 'gtm_e2e_no_email_verification_grace';

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
	/** A throwaway page holding `content`, such as a shop's own thank-you page. */
	createPage: ( content: string ) => Promise< CreatedPage >;
	/** Changes a product this test created, the way the store admin would. */
	updateProduct: ( product: CreatedProduct, changes: ProductChanges ) => Promise< void >;
	/** A throwaway coupon taking `percent` % off the cart. */
	createCoupon: ( percent: string ) => Promise< CreatedCoupon >;
	/**
	 * A throwaway tax rate in a tax class of its own; a product created with
	 * `{ tax_class: rate.taxClass }` is taxed at it.
	 */
	createTaxRate: ( options: TaxRateOptions ) => Promise< CreatedTaxRate >;
};

type PhpErrors = {
	/**
	 * Asserts PHP reported no warning, notice or fatal error while serving
	 * this test's browser requests so far. Call it last, once the requests the
	 * case checks have been answered.
	 */
	expectNone: () => Promise< void >;
};

/**
 * The test plugins in mu-plugins/ that change the store for this test's
 * browser only, each through a cookie. Call them before the page they change.
 */
type TestPlugins = {
	/**
	 * Offers a flat rate shipping method at `cost` (`'5.00'`), not taxed
	 * (flat-rate-shipping.php). The baseline store has none, and a real one
	 * would make every other test's cart need shipping.
	 */
	flatRateShipping: ( cost: string ) => Promise< void >;
	/**
	 * Marks `page` as an order confirmation page through the plugin's
	 * `gtm_server_side_is_order_confirmation_page` filter, the way a shop with
	 * its own thank-you page does (order-confirmation-page.php).
	 */
	markOrderConfirmationPage: ( page: CreatedPage ) => Promise< void >;
	/**
	 * Ends WooCommerce's 10-minute grace period for guest orders, so a new
	 * session asks for the order's email at once, as it does for the link in
	 * the order email opened later (email-verification-grace.php).
	 */
	endEmailVerificationGrace: () => Promise< void >;
};

/** Orders the guestBuyer fixture doesn't clean up, and what a case does to them as the store admin. */
type Orders = {
	setStatus: ( id: number, status: 'failed' | 'cancelled' ) => Promise< void >;
	/** Deletes an order with no guest buyer's email (one created in wp-admin) after the test. */
	deleteAfterTest: ( id: number ) => void;
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
	cartPage: CartPage;
	categoryPage: CategoryPage;
	productPage: ProductPage;
	checkoutPage: CheckoutPage;
	orderReceivedPage: OrderReceivedPage;
	classicLoopPage: ClassicLoopPage;
	classicCartPage: ClassicCartPage;
	homePage: HomePage;
	myAccountPage: MyAccountPage;
	shopPage: ShopPage;
	contentPage: ContentPage;
	adminNewOrderPage: AdminNewOrderPage;
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
	/** See TestPlugins. */
	testPlugins: TestPlugins;
	/**
	 * Starts a new session in this test's browser, as a new private window
	 * would: the browser forgets its cookies, and with them the WooCommerce
	 * session and the storeOptions() and testPlugins cookies set so far. It
	 * keeps the phpErrors one, which a spec can't set again.
	 */
	newSession: () => Promise< void >;
	/**
	 * Logs this test's browser in as the admin, with the cookies requestUtils
	 * already logged in with. The admin's WooCommerce session belongs to the
	 * user, not the browser, so it is shared with any other browser logged in
	 * as the admin.
	 */
	loginAsAdmin: () => Promise< void >;
	/** See Orders. */
	orders: Orders;
	/**
	 * What PHP reported while serving this test's browser requests, recorded
	 * by mu-plugins/record-php-errors.php: debug.log is shared by every test
	 * running at the same time. Starts recording before the first page load.
	 */
	phpErrors: PhpErrors;
	/**
	 * Billing details for a guest checkout, unique to this test. The orders
	 * placed with them, and the account the checkout creates with them when
	 * the test asks for one, are deleted after the test.
	 */
	guestBuyer: BillingDetails;
	/**
	 * A shopper to register on My Account, with an email unique to this test.
	 * The account registered with it is deleted after the test.
	 */
	newCustomer: NewCustomer;
	/**
	 * Content the named fixtures below don't cover: variable and grouped
	 * products, subcategories, tags, sets of products, coupons, tax rates.
	 * Deleted after the test.
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
	cartPage: async ( { page }, use ) => {
		await use( new CartPage( page ) );
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
	orderReceivedPage: async ( { page }, use ) => {
		await use( new OrderReceivedPage( page ) );
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
	myAccountPage: async ( { page }, use ) => {
		await use( new MyAccountPage( page ) );
	},
	shopPage: async ( { page }, use ) => {
		await use( new ShopPage( page ) );
	},
	contentPage: async ( { page }, use ) => {
		await use( new ContentPage( page ) );
	},
	adminNewOrderPage: async ( { page }, use ) => {
		await use( new AdminNewOrderPage( page ) );
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
	testPlugins: async ( { page, baseURL }, use ) => {
		const setCookie = ( name: string, value: string ) =>
			page.context().addCookies( [ { name, value, url: baseURL } ] );
		await use( {
			flatRateShipping: ( cost ) => setCookie( FLAT_RATE_COOKIE, cost ),
			markOrderConfirmationPage: ( created ) => setCookie( CONFIRMATION_PAGE_COOKIE, String( created.id ) ),
			endEmailVerificationGrace: () => setCookie( NO_EMAIL_VERIFICATION_GRACE_COOKIE, '1' ),
		} );
	},
	newSession: async ( { page }, use ) => {
		await use( async () => {
			const context = page.context();
			const kept = ( await context.cookies() ).filter( ( cookie ) => cookie.name === PHP_ERRORS_COOKIE );
			await context.clearCookies();
			await context.addCookies( kept );
		} );
	},
	loginAsAdmin: async ( { page, requestUtils }, use ) => {
		await use( async () => {
			if ( ! requestUtils.storageState?.nonce ) {
				await requestUtils.setupRest();
			}
			await page.context().addCookies( ( await requestUtils.request.storageState() ).cookies );
		} );
	},
	orders: async ( { requestUtils }, use ) => {
		const created: number[] = [];
		await use( {
			setStatus: ( id, status ) => setOrderStatus( requestUtils, id, status ),
			deleteAfterTest: ( id ) => {
				created.push( id );
			},
		} );
		await Promise.all( created.map( ( id ) => deleteOrder( requestUtils, id ) ) );
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
	guestBuyer: async ( { requestUtils }, use ) => {
		const buyer = buildGuestBuyer();
		await use( buyer );
		// The checkout creates a guest's orders, not REST, so catalog never
		// hears of them: they are found by the buyer's email.
		await deleteOrdersOf( requestUtils, buyer.email );
		await deleteAccountsOf( requestUtils, buyer.email );
	},
	newCustomer: async ( { requestUtils }, use ) => {
		const customer = buildNewCustomer();
		await use( customer );
		// The browser registers the account, not REST: found by its email.
		await deleteAccountsOf( requestUtils, customer.email );
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
			createPage: async ( content ) => {
				const created = await createPage( requestUtils, content );
				deletions.push( () => deletePage( requestUtils, created.id ) );
				return created;
			},
			updateProduct: ( product, changes ) => updateProduct( requestUtils, product, changes ),
			createCoupon: async ( percent ) => {
				const created = await createCoupon( requestUtils, percent );
				deletions.push( () => deleteCoupon( requestUtils, created.id ) );
				return created;
			},
			createTaxRate: async ( options ) => {
				const created = await createTaxRate( requestUtils, options );
				deletions.push( () => deleteTaxRate( requestUtils, created ) );
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
