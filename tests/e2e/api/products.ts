import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * Creating and deleting the products specs run against.
 *
 * Setup/teardown only - specs drive the actual shopper flows through the UI.
 * A throwaway product per test, created and removed over the WooCommerce REST
 * API, keeps tests isolated from each other and lets them run in parallel.
 *
 * Uses requestUtils.rest() (cookie + nonce auth as the logged-in admin), the
 * same mechanism @wordpress/e2e-test-utils-playwright already uses for core WP
 * REST calls - WooCommerce's REST API accepts it too.
 *
 * The request body factory lives here rather than in a directory of its own:
 * it has exactly one caller, right below it, and splitting the two would mean
 * every further entity (orders, customers, settings) costs two files that are
 * always edited together.
 */

let sequence = 0;

/** Unique per call, so parallel workers never collide on a name or SKU. */
function uniqueSuffix(): string {
	sequence += 1;
	return `${ Date.now() }-${ process.pid }-${ sequence }`;
}

export type SimpleProductRequest = {
	name: string;
	sku: string;
	type: 'simple';
	regular_price: string;
	status: 'publish';
	manage_stock: true;
	stock_quantity: number;
};

function buildSimpleProduct(
	overrides: Partial< SimpleProductRequest > = {}
): SimpleProductRequest {
	const unique = uniqueSuffix();
	return {
		name: `E2E Simple Product ${ unique }`,
		sku: `e2e-simple-${ unique }`,
		type: 'simple',
		regular_price: '20.00',
		status: 'publish',
		manage_stock: true,
		stock_quantity: 100,
		...overrides,
	};
}

export type CreatedProduct = SimpleProductRequest & {
	id: number;
	price: string;
	/** Absolute URL of the product page, as WooCommerce generated it. */
	permalink: string;
};

export async function createProduct(
	requestUtils: RequestUtils,
	overrides?: Partial< SimpleProductRequest >
): Promise< CreatedProduct > {
	const data = buildSimpleProduct( overrides );
	const created = await requestUtils.rest( {
		path: '/wc/v3/products',
		method: 'POST',
		data,
	} );
	return { ...data, id: created.id, price: created.price, permalink: created.permalink };
}

export async function deleteProduct( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wc/v3/products/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}
