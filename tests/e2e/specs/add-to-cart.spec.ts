import { expect, test } from '../fixtures';

test( 'clicking "Add to cart" on the shop grid pushes an add_to_cart event', async ( {
	shopPage,
	dataLayer,
	product,
} ) => {
	await shopPage.goto();
	await shopPage.addToCart( product.name );

	const addToCart = await dataLayer.waitFor( 'add_to_cart' );

	// toEqual, not objectContaining: the point of this spec is the shape of the
	// payload GTM receives, so a field the plugin stops sending - or starts
	// sending - has to fail here. Values that the environment rather than the
	// plugin decides (the grid position, the random cart id) are matched by
	// type, everything else by the exact value the fixture set up.
	expect( addToCart.ecommerce ).toEqual( {
		currency: 'USD',
		value: product.price,
		items: [
			{
				item_id: String( product.id ),
				item_name: product.name,
				item_sku: product.sku,
				item_brand: '',
				item_category: 'Uncategorized',
				price: product.price,
				quantity: 1,
				// Position in the grid: depends on how many other specs' products
				// exist at this moment, so assert the type, not the number.
				index: expect.any( Number ),
				imageUrl: '',
			},
		],
	} );

	// Cross-check against the plugin's own cart_state, which is built server
	// side from the real WC_Cart, so a passing event assertion can't hide a
	// cart that never actually updated.
	expect( addToCart.cart_state ).toEqual( {
		cart_id: expect.any( String ),
		cart_quantity: 1,
		cart_value: product.price,
		currency: 'USD',
		lines: [
			{
				item_id: String( product.id ),
				item_name: product.name,
				item_sku: product.sku,
				item_variant: '',
				price: product.price,
				line_total_price: product.price,
				quantity: 1,
			},
		],
	} );

	expect( addToCart.ecomm_pagetype ).toBe( 'product' );
} );
