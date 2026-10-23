import { expect, test } from '../../fixtures';
import { expectedItemListEcommerce, expectedListItem, withoutCartState } from '../../data-layer/expected';

/**
 * Rendered server-side on product category archives only: the plugin prints
 * it into wp_footer when is_product_category() is true (see
 * includes/class-gtm-server-side-event-viewitemlist.php). Its items are not
 * the grid's: get_category_data_layer_items() queries the category for at most
 * 10 products in title order, whatever the page shows.
 *
 * Products created one after another in a test get names that sort in the
 * same order (see uniqueSuffix() in api/products.ts), so the order they are
 * created in is the title order the plugin lists them in.
 */
test( "A product category page pushes view_item_list whose items carry that category's item_list_id and item_list_name @T71f5ab4d", async ( {
	categoryPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	// The case's prices, 101.00 and 102.00.
	const first = await catalog.createProduct( subcategory, { regular_price: '101.00' } );
	const second = await catalog.createProduct( subcategory, { regular_price: '102.00' } );

	await categoryPage.goto( subcategory );

	const viewItemList = await dataLayer.expectPushedOnce( 'view_item_list' );

	// The category fields follow the chain from the top, and the list is the
	// subcategory the page shows. `index` is only checked to be there: the
	// case leaves its values to the title-order case, since with two products
	// in title order this one can't tell a right index from a wrong one.
	const extra = {
		item_category: category.name,
		item_category2: subcategory.name,
		quantity: 1,
		index: expect.any( Number ) as unknown as number,
	};
	expect( withoutCartState( viewItemList ) ).toEqual( {
		event: 'view_item_list_stape',
		ecomm_pagetype: 'category',
		ecommerce: expectedItemListEcommerce( [
			expectedListItem( first, subcategory, extra ),
			expectedListItem( second, subcategory, extra ),
		] ),
	} );
} );

test( 'view_item_list on a parent category includes products assigned only to its child categories @T05a69b04', async ( {
	categoryPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	const first = await catalog.createProduct( subcategory );
	const second = await catalog.createProduct( subcategory );

	await categoryPage.goto( category );

	const viewItemList = await dataLayer.expectPushedOnce( 'view_item_list' );

	// The case is about which products are listed and under which list; the
	// rest of the event belongs to the case above. The name is spelled out, so
	// a dropped suffix fails here too.
	expect( viewItemList.event ).toBe( 'view_item_list_stape' );
	expect( viewItemList.ecomm_pagetype ).toBe( 'category' );
	// The page's category is the list, not the product's own; the category
	// fields keep the product's chain.
	const inParentList = {
		item_list_id: category.id,
		item_list_name: category.name,
		item_category: category.name,
		item_category2: subcategory.name,
	};
	expect( viewItemList.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_name: first.name, ...inParentList } ),
		expect.objectContaining( { item_name: second.name, ...inParentList } ),
	] );
} );

test( 'view_item_list lists at most 10 products, even when the page shows more @T601070af', async ( {
	categoryPage,
	dataLayer,
	catalog,
	storeOptions,
	category,
} ) => {
	// WooCommerce's default grid, 16 per page, set rather than assumed: all 11
	// products fit on one page.
	await storeOptions( { catalogColumns: '4', catalogRows: '4' } );
	const subcategory = await catalog.createCategory( category );
	const products = [];
	for ( let i = 0; i < 11; i++ ) {
		products.push( await catalog.createProduct( subcategory ) );
	}
	const names = products.map( ( product ) => product.name );

	await categoryPage.goto( subcategory );

	const viewItemList = await dataLayer.expectPushedOnce( 'view_item_list' );
	expect( viewItemList.event ).toBe( 'view_item_list_stape' );

	const shown = await categoryPage.productNames();
	expect( shown ).toHaveLength( 11 );
	expect( shown ).toEqual( expect.arrayContaining( names ) );
	// The first 10 in title order; the 11th is left out.
	expect( viewItemList.ecommerce?.items ).toEqual(
		names.slice( 0, 10 ).map( ( name, i ) => expect.objectContaining( { item_name: name, index: i + 1 } ) )
	);
} );

test( 'view_item_list keeps title order, ignoring the shop sort order and the page number @T47bbbf34', async ( {
	categoryPage,
	dataLayer,
	storeOptions,
	catalog,
	category,
} ) => {
	// 2 rows of 4: page 1 holds 8 products, page 2 the last 3. Set before the
	// first page load; it doesn't change which products the price sort puts first.
	await storeOptions( { catalogColumns: '4', catalogRows: '2' } );
	const subcategory = await catalog.createCategory( category );
	const products = [];
	for ( let i = 1; i <= 11; i++ ) {
		// Dearer the later it sorts by title, so sorting by price reverses the order.
		products.push( await catalog.createProduct( subcategory, { regular_price: `${ 100 + i }.00` } ) );
	}
	const names = products.map( ( product ) => product.name );
	const firstTenInTitleOrder = names
		.slice( 0, 10 )
		.map( ( name, i ) => expect.objectContaining( { item_name: name, index: i + 1 } ) );

	await categoryPage.goto( subcategory, { orderby: 'price-desc' } );

	const sortedByPrice = await dataLayer.expectPushedOnce( 'view_item_list' );
	expect( sortedByPrice.event ).toBe( 'view_item_list_stape' );
	expect( ( await categoryPage.productNames() ).slice( 0, 3 ) ).toEqual( [ names[ 10 ], names[ 9 ], names[ 8 ] ] );
	expect( sortedByPrice.ecommerce?.items ).toEqual( firstTenInTitleOrder );

	await categoryPage.goto( subcategory, { pageNumber: 2 } );

	const pageTwo = await dataLayer.expectPushedOnce( 'view_item_list' );
	expect( pageTwo.event ).toBe( 'view_item_list_stape' );
	expect( await categoryPage.productNames() ).toEqual( names.slice( 8 ) );
	// The same first 10, not the 3 page 2 shows.
	expect( pageTwo.ecommerce?.items ).toEqual( firstTenInTitleOrder );
} );

test( 'Shop, tag and search pages push no view_item_list @Tfe0fd564', async ( {
	shopPage,
	productTagPage,
	productSearchPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const tag = await catalog.createTag();
	// The tag's name in both descriptions gives the search a keyword that finds
	// these two products and nothing else. Two, so the search shows its results
	// page instead of redirecting to the only product found.
	const tagged = [
		await catalog.createProduct( category, { tags: [ tag ], description: tag.name } ),
		await catalog.createProduct( category, { tags: [ tag ], description: tag.name } ),
	];
	const names = tagged.map( ( product ) => product.name );

	// Every test's products are in the shop, so these two may well be on
	// another page of it: a grid with products shows the page did its work.
	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'view_item_list' );

	await productTagPage.goto( tag );
	expect( await productTagPage.productNames() ).toEqual( expect.arrayContaining( names ) );
	await dataLayer.expectNotPushed( 'view_item_list' );

	await productSearchPage.goto( tag.name );
	expect( await productSearchPage.productNames() ).toEqual( expect.arrayContaining( names ) );
	await dataLayer.expectNotPushed( 'view_item_list' );
} );
