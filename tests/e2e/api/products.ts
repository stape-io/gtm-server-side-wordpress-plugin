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

/**
 * Unique per call, so parallel workers never collide on a name, slug, SKU or
 * email. Within one worker a later call also sorts later as text (the
 * timestamp has a fixed width, the counter is zero-padded), so names created
 * one after another come back in the same order from an ORDER BY title.
 */
export function uniqueSuffix(): string {
	sequence += 1;
	return `${ Date.now() }-${ process.pid }-${ String( sequence ).padStart( 6, '0' ) }`;
}

export type CreatedCategory = {
	id: number;
	name: string;
	slug: string;
	/** Absolute URL of the category archive. */
	link: string;
};

/** A category for this test; with `parent`, a subcategory of it. */
export async function createCategory(
	requestUtils: RequestUtils,
	parent?: CreatedCategory
): Promise< CreatedCategory > {
	// wp/v2 rather than wc/v3: only the core endpoint returns the archive link.
	const created = await requestUtils.rest( {
		path: '/wp/v2/product_cat',
		method: 'POST',
		data: {
			name: `${ NAME_PREFIX }Category ${ uniqueSuffix() }`,
			...( parent ? { parent: parent.id } : {} ),
		},
	} );
	return { id: created.id, name: created.name, slug: created.slug, link: created.link };
}

export type CreatedTag = {
	id: number;
	name: string;
	/** Absolute URL of the tag archive. */
	link: string;
};

/** A product tag for this test. */
export async function createTag( requestUtils: RequestUtils ): Promise< CreatedTag > {
	// wp/v2 rather than wc/v3, as for categories: only the core endpoint returns the archive link.
	const created = await requestUtils.rest( {
		path: '/wp/v2/product_tag',
		method: 'POST',
		data: { name: `${ NAME_PREFIX }Tag ${ uniqueSuffix() }` },
	} );
	return { id: created.id, name: created.name, link: created.link };
}

export async function deleteTag( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wp/v2/product_tag/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

export async function deleteCategory( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wp/v2/product_cat/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

/**
 * What createProduct() makes. Simple by default, at 20.00; a sale price puts
 * it on sale, `tags` tags it, and `description` gives a search something to
 * find besides the generated name. A variable product always has the same two
 * variations, and a grouped one links the given products.
 */
export type ProductOptions =
	| {
			type?: 'simple';
			regular_price?: string;
			sale_price?: string;
			tags?: CreatedTag[];
			description?: string;
	  }
	| { type: 'variable' }
	| { type: 'grouped'; children: CreatedProduct[] };

type VariationAttribute = { name: string; option: string };

export type CreatedVariation = {
	id: number;
	sku: string;
	regular_price: string;
	attributes: VariationAttribute[];
};

/**
 * The variable product of the Testomat cases (Cap Hoodie): Color and Size,
 * both used for variations. The Red variation sets no Size, so a shopper picks
 * any; it is also the cheaper one.
 */
const VARIABLE_ATTRIBUTES = [
	{ name: 'Color', options: [ 'Red', 'Blue' ], variation: true, visible: true },
	{ name: 'Size', options: [ 'S', 'M' ], variation: true, visible: true },
];
const VARIATIONS: Array< { sku: string; regular_price: string; attributes: VariationAttribute[] } > = [
	{ sku: 'red', regular_price: '30.00', attributes: [ { name: 'Color', option: 'Red' } ] },
	{
		sku: 'blue-m',
		regular_price: '32.00',
		attributes: [
			{ name: 'Color', option: 'Blue' },
			{ name: 'Size', option: 'M' },
		],
	},
];

export type CreatedProduct = {
	id: number;
	type: 'simple' | 'variable' | 'grouped';
	name: string;
	sku: string;
	/**
	 * The price WooCommerce reports: the sale price for a product on sale, the
	 * lowest variation's or child's for a variable or grouped one.
	 */
	price: string;
	/** Absolute URL of the product page, as WooCommerce generated it. */
	permalink: string;
	category: CreatedCategory;
	/** A variable product's variations, in the order of VARIATIONS; empty for any other. */
	variations: CreatedVariation[];
};

function typeFields( options: ProductOptions ): Record< string, unknown > {
	switch ( options.type ) {
		case 'variable':
			return { attributes: VARIABLE_ATTRIBUTES };
		case 'grouped':
			return { grouped_products: options.children.map( ( child ) => child.id ) };
		default:
			return {
				regular_price: options.regular_price ?? '20.00',
				...( options.sale_price ? { sale_price: options.sale_price } : {} ),
				...( options.tags ? { tags: options.tags.map( ( tag ) => ( { id: tag.id } ) ) } : {} ),
				...( options.description ? { description: options.description } : {} ),
				manage_stock: true,
				stock_quantity: 100,
			};
	}
}

/** A published product in `category` only. */
export async function createProduct(
	requestUtils: RequestUtils,
	category: CreatedCategory,
	options: ProductOptions = {}
): Promise< CreatedProduct > {
	const type = options.type ?? 'simple';
	const unique = uniqueSuffix();
	const label = type.charAt( 0 ).toUpperCase() + type.slice( 1 );
	let created = await requestUtils.rest( {
		path: '/wc/v3/products',
		method: 'POST',
		data: {
			name: `${ NAME_PREFIX }${ label } Product ${ unique }`,
			sku: `e2e-${ type }-${ unique }`,
			type,
			status: 'publish',
			categories: [ { id: category.id } ],
			...typeFields( options ),
		},
	} );

	const variations: CreatedVariation[] = [];
	try {
		if ( type === 'variable' ) {
			for ( const variation of VARIATIONS ) {
				const made = await requestUtils.rest( {
					path: `/wc/v3/products/${ created.id }/variations`,
					method: 'POST',
					data: { ...variation, sku: `${ created.sku }-${ variation.sku }` },
				} );
				variations.push( {
					id: made.id,
					sku: made.sku,
					regular_price: made.regular_price,
					attributes: variation.attributes,
				} );
			}
		}
		if ( type !== 'simple' ) {
			// The POST answered with the price from before the variations were
			// added, or before the grouped product's children were synced.
			created = await requestUtils.rest( { path: `/wc/v3/products/${ created.id }` } );
		}
	} catch ( error ) {
		// The caller never gets the product, so nothing else would delete it.
		await deleteProduct( requestUtils, created.id );
		throw error;
	}

	return {
		id: created.id,
		type,
		name: created.name,
		sku: created.sku,
		price: created.price,
		permalink: created.permalink,
		category,
		variations,
	};
}

export async function deleteProduct( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wc/v3/products/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

/**
 * Deletes every product, category and tag a previous run left behind. Fixtures
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
	for ( let ids = await leftovers( '/wp/v2/product_tag' ); ids.length; ids = await leftovers( '/wp/v2/product_tag' ) ) {
		await Promise.all( ids.map( ( id ) => deleteTag( requestUtils, id ) ) );
	}
}
