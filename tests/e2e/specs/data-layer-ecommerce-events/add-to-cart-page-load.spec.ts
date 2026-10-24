import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, expectedVariationItem, withoutCartState } from '../../data-layer/expected';

test( 'Adding a simple product with quantity 2 on its product page pushes one add_to_cart after the reload with quantity 2 and value = 2 × price @Tac0f11fb', async ( {
	dataLayer,
	product,
	productPage,
} ) => {
	await productPage.goto( product );
	await productPage.setQuantity( 2 );
	await productPage.addToCart();

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( addToCart ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'add_to_cart_stape',
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The case leaves index out; a single item can only be 1.
				expectedItem( product, { quantity: 2, index: 1 } ),
			] ),
			// Pinned rather than computed: 2 x 20.00.
			value: '40.00',
		},
	} );
} );

test( 'Adding a variation pushes one add_to_cart with the variation\'s id, SKU and price, and item_variant incl. the value chosen for an "Any" attribute @Tfdf8de96', async ( {
	catalog,
	category,
	dataLayer,
	productPage,
} ) => {
	const variableProduct = await catalog.createProduct( category, { type: 'variable' } );
	// Red comes first and sets no Size, so the shopper picks one (see VARIATIONS in api/products.ts).
	const [ red ] = variableProduct.variations;

	await productPage.goto( variableProduct );
	await productPage.chooseOptions( { Color: 'Red', Size: 'M' } );
	await productPage.addToCart();

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The variation, under its parent's category. The variation itself
				// says only Red; the M comes from what the shopper chose.
				expectedVariationItem( variableProduct, red, {
					// WooCommerce names a variation after its parent and the
					// attributes it sets: Red only.
					item_name: `${ variableProduct.name } - Red`,
					item_variant: 'Red,M',
					quantity: 1,
					index: 1,
				} ),
			] ),
			value: '30.00',
		},
	} );
} );

test( 'Adding a grouped product pushes one add_to_cart with one item per child that had a quantity @Tc725d71c', async ( {
	catalog,
	category,
	dataLayer,
	product,
	productPage,
	saleProduct,
} ) => {
	const groupedProduct = await catalog.createProduct( category, {
		type: 'grouped',
		children: [ saleProduct, product ],
	} );

	await productPage.goto( groupedProduct );
	await productPage.setGroupedQuantity( saleProduct, 1 );
	await productPage.setGroupedQuantity( product, 2 );
	await productPage.addToCart();

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	// One item per child, in the order WooCommerce added them, and none for
	// the grouped product itself.
	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				expectedItem( saleProduct, { quantity: 1, index: 1 } ),
				expectedItem( product, { quantity: 2, index: 2 } ),
			] ),
			// Pinned rather than computed: 1 x 35.00 + 2 x 20.00.
			value: '75.00',
		},
	} );
} );

test( 'A non-AJAX archive ?add-to-cart= link pushes one add_to_cart on the next page, with ecomm_pagetype product @T40cd9036', async ( {
	dataLayer,
	product,
	shopPage,
	storeOptions,
} ) => {
	// Off, the grid's "Add to cart" is a link that loads the shop again. The
	// shop is shared: newest first and 100 to a page keep this test's
	// product on page 1 (see README.md).
	await storeOptions( { ajaxAddToCart: 'no', catalogColumns: '4', catalogRows: '25' } );
	await shopPage.goto( { orderby: 'date' } );
	await shopPage.followAddToCartLink( product.name );

	// The link keeps the shop's query, so the sort comes along.
	expect( shopPage.path() ).toBe( `/shop/?orderby=date&add-to-cart=${ product.id }` );

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		// A contract: see the case's Decision. The page shown is the shop.
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// index is the position in the pushed items array, not in the grid.
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			value: '20.00',
		},
	} );
} );

test( 'The page after the one that showed the server-side add_to_cart pushes no second add_to_cart @T33d0b236', async ( {
	dataLayer,
	product,
	productPage,
	shopPage,
} ) => {
	await shopPage.gotoAddingToCart( product );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await shopPage.goto();
	// The shop is shared, so this test's product may be on another page of
	// it; any product shows the page rendered its grid.
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'add_to_cart' );

	await productPage.goto( product );
	// view_item shows the plugin printed this page's events.
	await dataLayer.expectPushedOnce( 'view_item' );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );

test( 'An add whose next render comes more than 300 s later pushes no add_to_cart @Td335edde', async ( {
	dataLayer,
	product,
	shopPage,
	storeOptions,
} ) => {
	// Two adds and a 310 s wait between the second and its render.
	test.setTimeout( 6 * 60_000 );
	await storeOptions( { cartRedirectAfterAdd: 'yes' } );

	// The control first, in the same session: its render empties the stash,
	// so the add after it is stashed on its own.
	await shopPage.addToCartWithoutRendering( product );
	await shopPage.goto();
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await shopPage.addToCartWithoutRendering( product );
	// The case's wait, spent watching the control page: an add that renders
	// no page must not push one there either.
	await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 310_000 } );

	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );

test( 'A Store API / AJAX add leaves nothing in the stash, so the next page load pushes no add_to_cart @T5cae07f5', async ( {
	catalog,
	classicLoopPage,
	dataLayer,
	product,
	productPage,
	saleProduct,
	shopPage,
	storeOptions,
} ) => {
	await storeOptions( { catalogColumns: '4', catalogRows: '25' } );

	// wc-ajax: the classic loop's add pushes at click time. The case waits 3 seconds.
	const loopPage = await catalog.createClassicLoopPage( product.category );
	await classicLoopPage.goto( loopPage );
	await classicLoopPage.addToCart( product.name );
	const clickPush = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );
	// The rest of the event is the AJAX click suite's (T38c3a859).
	expect( clickPush.event ).toBe( 'add_to_cart_stape' );

	await productPage.goto( product );
	await dataLayer.expectPushedOnce( 'view_item' );
	await dataLayer.expectNotPushed( 'add_to_cart' );

	// Store API: the block grid on the shared shop, newest first and 100 to a
	// page so this test's product is on page 1 (see README.md).
	await shopPage.goto( { orderby: 'date' } );
	await shopPage.addToCartUntilAdded( saleProduct.name );

	await productPage.goto( saleProduct );
	await dataLayer.expectPushedOnce( 'view_item' );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );
