import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

/**
 * Pushed by the "Add to cart" click on a product grid, next to add_to_cart
 * (pushSelectItem() in assets/js/javascript.js). The page type and the list
 * come from data attributes attach_data_to_event_select_item() adds to the
 * button (includes/class-gtm-server-side-event-addtocart.php), so the list
 * fields are strings, and empty on pages that list no term.
 */
test( "Add to cart on a category page pushes select_item with ecomm_pagetype category and the category's id and name @T229b5d36", async ( {
	categoryPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	const product = await catalog.createProduct( subcategory );

	await categoryPage.goto( subcategory );
	await categoryPage.addToCart( product.name );

	const selectItem = await dataLayer.expectPushedOnce( 'select_item' );

	expect( withoutCartState( selectItem ) ).toEqual( {
		event: 'select_item_stape',
		ecomm_pagetype: 'category',
		ecommerce: {
			...expectedEcommerce( [
				expectedItem( product, {
					// The category fields follow the chain from the top.
					item_category: category.name,
					item_category2: subcategory.name,
					quantity: 1,
					// Only checked to be there: no case covers its value.
					index: expect.any( Number ) as unknown as number,
				} ),
			] ),
			collection_id: String( subcategory.id ),
			item_list_name: subcategory.name,
		},
	} );
} );

test( "Add to cart on a tag page pushes select_item with ecomm_pagetype tag and the tag's id and name @Tdcc60234", async ( {
	productTagPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const tag = await catalog.createTag();
	const product = await catalog.createProduct( category, { tags: [ tag ] } );

	await productTagPage.goto( tag );
	await productTagPage.addToCart( product.name );

	const selectItem = await dataLayer.expectPushedOnce( 'select_item' );

	// The case is about the page type, the list and the clicked item; the rest
	// of the event belongs to the category case.
	expect( selectItem.event ).toBe( 'select_item_stape' );
	expect( selectItem.ecomm_pagetype ).toBe( 'tag' );
	expect( selectItem.ecommerce?.collection_id ).toBe( String( tag.id ) );
	expect( selectItem.ecommerce?.item_list_name ).toBe( tag.name );
	expect( selectItem.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( product.id ), item_name: product.name } ),
	] );
} );

test( 'Add to cart on the shop page pushes select_item with ecomm_pagetype shop and empty list fields @T65ef045e', async ( {
	shopPage,
	dataLayer,
	storeOptions,
	product,
} ) => {
	// Keeps this test's product on page 1 of the shared shop (see "On a page
	// every test shares" in tests/e2e/README.md).
	await storeOptions( { catalogColumns: '4', catalogRows: '25' } );

	await shopPage.goto( { orderby: 'date' } );
	await shopPage.addToCart( product.name );

	const selectItem = await dataLayer.expectPushedOnce( 'select_item' );

	// As on the tag page, only the fields the case lists.
	expect( selectItem.event ).toBe( 'select_item_stape' );
	expect( selectItem.ecomm_pagetype ).toBe( 'shop' );
	expect( selectItem.ecommerce?.collection_id ).toBe( '' );
	expect( selectItem.ecommerce?.item_list_name ).toBe( '' );
	expect( selectItem.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( product.id ), item_name: product.name } ),
	] );
} );

test( 'Add to cart on product search results pushes select_item with ecomm_pagetype search @T1f167acc', async ( {
	productSearchPage,
	dataLayer,
	catalog,
	category,
} ) => {
	// The category's name in both descriptions gives the search a keyword that
	// finds these two products and nothing else. Two, so the search shows its
	// results page instead of redirecting to the only product found.
	const product = await catalog.createProduct( category, { description: category.name } );
	await catalog.createProduct( category, { description: category.name } );

	await productSearchPage.goto( category.name );
	await productSearchPage.addToCart( product.name );

	const selectItem = await dataLayer.expectPushedOnce( 'select_item' );

	// As on the tag page, only the fields the case lists.
	expect( selectItem.event ).toBe( 'select_item_stape' );
	expect( selectItem.ecomm_pagetype ).toBe( 'search' );
	expect( selectItem.ecommerce?.collection_id ).toBe( '' );
	expect( selectItem.ecommerce?.item_list_name ).toBe( '' );
	expect( selectItem.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( product.id ), item_name: product.name } ),
	] );
} );
