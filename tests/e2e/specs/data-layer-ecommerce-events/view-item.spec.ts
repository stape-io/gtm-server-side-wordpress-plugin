import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, expectedVariationItem, withoutCartState } from '../../data-layer/expected';

/**
 * Unlike add_to_cart, this event is rendered server-side: the plugin prints it
 * into wp_footer when is_product() is true (see
 * includes/class-gtm-server-side-event-viewitem.php), so it does not depend on
 * the theme's markup or on any click handler.
 */
test( "view_item reports a simple product's id, SKU, name, price and category, once per page view @Ta58bd16c", async ( {
	productPage,
	dataLayer,
	product,
} ) => {
	await productPage.goto( product );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	// cart_state has its own cases, so it is left out here.
	expect( withoutCartState( viewItem ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( product ) ] ),
	} );
} );

test( 'view_item reports the sale price for a product on sale @T53ba07d3', async ( {
	productPage,
	dataLayer,
	saleProduct,
} ) => {
	await productPage.goto( saleProduct );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	// price and value are the sale price (35.00), not the regular 50.00. No
	// GA4 `discount` is expected: the plugin doesn't send one, and toEqual
	// fails if it starts to.
	expect( withoutCartState( viewItem ) ).toEqual( {
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( saleProduct ) ] ),
	} );
} );

test( 'view_item on a variable product reports the parent with its lowest variation price and no item_variant @Tf06786e2', async ( {
	productPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const variableProduct = await catalog.createProduct( category, { type: 'variable' } );
	// Red is the cheaper of the two variations (see VARIATIONS in api/products.ts).
	const red = variableProduct.variations.find( ( variation ) =>
		variation.attributes.some( ( { name, option } ) => name === 'Color' && option === 'Red' )
	);

	await productPage.goto( variableProduct );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	// The parent, not a variation: no option is chosen on page load, and
	// get_data_layer_item() adds item_variant to a variation only, so toEqual
	// fails if the parent gets one.
	expect( withoutCartState( viewItem ) ).toEqual( {
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( variableProduct, { price: red?.regular_price } ) ] ),
	} );
} );

test( 'view_item on a grouped product reports the grouped product with its lowest child price @Te55cf7f9', async ( {
	productPage,
	dataLayer,
	catalog,
	category,
	product,
	saleProduct,
} ) => {
	const groupedProduct = await catalog.createProduct( category, {
		type: 'grouped',
		children: [ saleProduct, product ],
	} );

	await productPage.goto( groupedProduct );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	// One item, the grouped product itself, priced at its cheapest child:
	// `product` at 20.00 rather than `saleProduct` at 35.00.
	expect( withoutCartState( viewItem ) ).toEqual( {
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( groupedProduct, { price: product.price } ) ] ),
	} );
} );

test( "view_item category fields follow the first category's parent chain (item_category, item_category2, …) @Tf1b08929", async ( {
	productPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	// In the subcategory only, so the parent reaches the event through the chain alone.
	const productInSubcategory = await catalog.createProduct( subcategory );

	await productPage.goto( productInSubcategory );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );
	const item = viewItem.ecommerce?.items?.[ 0 ];

	// The case is about the category fields; the rest of the event belongs to
	// the cases above.
	expect( item ).toMatchObject( { item_category: category.name, item_category2: subcategory.name } );
	expect( item ).not.toHaveProperty( 'item_category3' );
	expect( item ).not.toHaveProperty( 'item_category4' );
	expect( item ).not.toHaveProperty( 'item_category5' );
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet: QA creates it (see DEV-12487's PR) and appends its @T<id>.
test( 'Choosing a variation pushes view_item with the variation\'s id, SKU, price and item_variant incl. the value chosen for an "Any" attribute', async ( {
	productPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const variableProduct = await catalog.createProduct( category, { type: 'variable' } );
	// Red comes first and sets no Size, so the shopper picks one (see VARIATIONS in api/products.ts).
	const [ red ] = variableProduct.variations;

	await productPage.goto( variableProduct );
	await dataLayer.expectPushedOnce( 'view_item' );
	await productPage.chooseOptions( { Color: 'Red', Size: 'M' } );

	// The page's own view_item first, then the one for the choice.
	const [ , viewVariation ] = await dataLayer.expectPushedTimes( 'view_item', 2 );

	// Shaped as the page's own view_item, with the variation as the item.
	expect( withoutCartState( viewVariation ) ).toEqual( {
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [
			expectedVariationItem( variableProduct, red, {
				item_name: `${ variableProduct.name } - Red`,
				item_variant: 'Red,M',
			} ),
		] ),
	} );
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet: QA creates it (see DEV-12487's PR) and appends its @T<id>.
test( 'Switching to another variation pushes view_item for it, and choosing the same variation again pushes none', async ( {
	productPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const variableProduct = await catalog.createProduct( category, { type: 'variable' } );
	const [ red, blueM ] = variableProduct.variations;

	await productPage.goto( variableProduct );
	await dataLayer.expectPushedOnce( 'view_item' );
	await productPage.chooseOptions( { Color: 'Red', Size: 'M' } );
	await dataLayer.expectPushedTimes( 'view_item', 2 );
	await productPage.chooseOptions( { Color: 'Blue' } );
	await dataLayer.expectPushedTimes( 'view_item', 3 );
	await productPage.chooseOptions( { Color: 'Red' } );
	await dataLayer.expectPushedTimes( 'view_item', 4 );

	// The same value again: WooCommerce matches Red once more.
	await productPage.chooseOptions( { Size: 'M' } );
	const viewItems = await dataLayer.expectPushedTimes( 'view_item', 4, { quietMs: 2000 } );

	expect( viewItems.slice( 1 ).map( ( viewItem ) => viewItem.ecommerce?.items ) ).toEqual( [
		[ expectedVariationItem( variableProduct, red, { item_name: `${ variableProduct.name } - Red`, item_variant: 'Red,M' } ) ],
		[ expectedVariationItem( variableProduct, blueM, { item_name: `${ variableProduct.name } - Blue, M`, item_variant: 'Blue,M' } ) ],
		[ expectedVariationItem( variableProduct, red, { item_name: `${ variableProduct.name } - Red`, item_variant: 'Red,M' } ) ],
	] );
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet: QA creates it (see DEV-12487's PR) and appends its @T<id>.
test( 'A variation preselected by the product\'s default options pushes no view_item of its own on page load', async ( {
	productPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const variableProduct = await catalog.createProduct( category, {
		type: 'variable',
		default_attributes: [
			{ name: 'Color', option: 'Blue' },
			{ name: 'Size', option: 'M' },
		],
	} );
	const red = variableProduct.variations.find( ( variation ) =>
		variation.attributes.some( ( { name, option } ) => name === 'Color' && option === 'Red' )
	);

	await productPage.goto( variableProduct );
	// WooCommerce matched the preselected Blue / M, as it does for a shopper's choice.
	await productPage.waitForVariation();

	// Only the page's own view_item, still the parent at its lowest price.
	const viewItem = await dataLayer.expectPushedOnce( 'view_item', { quietMs: 2000 } );
	expect( withoutCartState( viewItem ) ).toEqual( {
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( variableProduct, { price: red?.regular_price } ) ] ),
	} );
} );
