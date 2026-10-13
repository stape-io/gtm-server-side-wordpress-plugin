import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * Creating and deleting the catalog specs run against, over the REST API.
 *
 * Setup/teardown only - specs drive the actual shopper flows through the UI.
 * Every test gets a throwaway category holding a throwaway product, so a
 * listing page (the category archive) shows exactly what the test created,
 * whatever else exists in the store or runs in parallel.
 *
 * Uses requestUtils.rest() (cookie + nonce auth as the logged-in admin), the
 * same mechanism @wordpress/e2e-test-utils-playwright uses for core WP REST
 * calls - WooCommerce's REST API accepts it too.
 */

/** Every name created here starts with this, which is what purgeTestCatalog() looks for. */
const NAME_PREFIX = 'E2E ';

let sequence = 0;

/** Unique per call, so parallel workers never collide on a name, slug, SKU or email. */
export function uniqueSuffix(): string {
	sequence += 1;
	return `${ Date.now() }-${ process.pid }-${ sequence }`;
}

export type CreatedCategory = {
	id: number;
	name: string;
	slug: string;
	/** Absolute URL of the category archive. */
	link: string;
};

export async function createCategory( requestUtils: RequestUtils ): Promise< CreatedCategory > {
	// wp/v2 rather than wc/v3: only the core endpoint returns the archive link.
	const created = await requestUtils.rest( {
		path: '/wp/v2/product_cat',
		method: 'POST',
		data: { name: `${ NAME_PREFIX }Category ${ uniqueSuffix() }` },
	} );
	return { id: created.id, name: created.name, slug: created.slug, link: created.link };
}

export async function deleteCategory( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wp/v2/product_cat/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
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
		name: `${ NAME_PREFIX }Simple Product ${ unique }`,
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
	category: CreatedCategory;
};

export async function createProduct(
	requestUtils: RequestUtils,
	category: CreatedCategory,
	overrides?: Partial< SimpleProductRequest >
): Promise< CreatedProduct > {
	const data = buildSimpleProduct( overrides );
	const created = await requestUtils.rest( {
		path: '/wc/v3/products',
		method: 'POST',
		data: { ...data, categories: [ { id: category.id } ] },
	} );
	return { ...data, id: created.id, price: created.price, permalink: created.permalink, category };
}

export async function deleteProduct( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wc/v3/products/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

/**
 * Deletes every product and category a previous run left behind. Fixtures
 * clean up after themselves, but a killed run (Ctrl+C, CI timeout) skips
 * fixture teardown.
 */
export async function purgeTestCatalog( requestUtils: RequestUtils ): Promise< void > {
	const leftovers = async ( path: string ): Promise< number[] > => {
		const found: Array< { id: number; name: string } > = await requestUtils.rest( {
			path,
			params: { search: NAME_PREFIX.trim(), per_page: 100, status: 'any' },
		} );
		return found.filter( ( item ) => item.name.startsWith( NAME_PREFIX ) ).map( ( item ) => item.id );
	};

	for ( let ids = await leftovers( '/wc/v3/products' ); ids.length; ids = await leftovers( '/wc/v3/products' ) ) {
		await Promise.all( ids.map( ( id ) => deleteProduct( requestUtils, id ) ) );
	}
	for ( let ids = await leftovers( '/wp/v2/product_cat' ); ids.length; ids = await leftovers( '/wp/v2/product_cat' ) ) {
		await Promise.all( ids.map( ( id ) => deleteCategory( requestUtils, id ) ) );
	}
}
