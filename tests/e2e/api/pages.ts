import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { uniqueSuffix, type CreatedCategory } from './products';

/**
 * Storefront pages a test creates for itself, over the REST API: a page
 * holding a WooCommerce shortcode renders that shortcode's classic markup and
 * scripts inside the block theme, without switching the theme.
 */

/** Every title created here starts with this, which is what purgeTestPages() looks for. */
const TITLE_PREFIX = 'E2E ';

export type CreatedPage = {
	id: number;
	/** Absolute URL of the published page. */
	link: string;
};

/**
 * A published page with the classic product loop (`[products]`) of one
 * category, so it lists only what the test put there. The classic loop loads
 * WooCommerce's `wc-add-to-cart.js`, which the block grid doesn't.
 */
export async function createClassicLoopPage(
	requestUtils: RequestUtils,
	category: CreatedCategory
): Promise< CreatedPage > {
	const created = await requestUtils.rest( {
		path: '/wp/v2/pages',
		method: 'POST',
		data: {
			title: `${ TITLE_PREFIX }Classic Loop ${ uniqueSuffix() }`,
			status: 'publish',
			content: `[products category="${ category.slug }"]`,
		},
	} );
	return { id: created.id, link: created.link };
}

/**
 * A published page with the classic cart (`[woocommerce_cart]`). WooCommerce
 * treats a page holding the shortcode as a cart page (`woocommerce-cart` body
 * class), and its form updates quantities over WooCommerce's `cart.js`, where
 * the store's own cart page is the Cart block.
 */
export async function createClassicCartPage( requestUtils: RequestUtils ): Promise< CreatedPage > {
	const created = await requestUtils.rest( {
		path: '/wp/v2/pages',
		method: 'POST',
		data: {
			title: `${ TITLE_PREFIX }Classic Cart ${ uniqueSuffix() }`,
			status: 'publish',
			content: '[woocommerce_cart]',
		},
	} );
	return { id: created.id, link: created.link };
}

export async function deletePage( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wp/v2/pages/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

/** Deletes every page a previous run left behind (see purgeTestCatalog()). */
export async function purgeTestPages( requestUtils: RequestUtils ): Promise< void > {
	const leftovers = async (): Promise< number[] > => {
		const found: Array< { id: number; title: { rendered: string } } > = await requestUtils.rest( {
			path: '/wp/v2/pages',
			params: { search: TITLE_PREFIX.trim(), per_page: 100, status: 'publish,draft,trash' },
		} );
		return found.filter( ( page ) => page.title.rendered.startsWith( TITLE_PREFIX ) ).map( ( page ) => page.id );
	};

	for ( let ids = await leftovers(); ids.length; ids = await leftovers() ) {
		await Promise.all( ids.map( ( id ) => deletePage( requestUtils, id ) ) );
	}
}
