import { expect, test } from '../../fixtures';

test( 'view_cart cart_quantity is the number of lines, not units @T2c541fc7', async ( {
	cartPage,
	dataLayer,
	homePage,
	product,
	saleProduct,
} ) => {
	// 2 lines, 6 units.
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );

	await cartPage.goto();
	const viewCart = await dataLayer.expectPushedOnce( 'view_cart' );

	// Spelled out rather than resolved, so a dropped suffix fails here.
	expect( viewCart.event ).toBe( 'view_cart_stape' );
	// Lines, not units: see the case's Decision.
	expect( viewCart.cart_quantity ).toBe( 2 );
} );

test( 'An empty cart page pushes no view_cart @T4306f033', async ( { cartPage, dataLayer } ) => {
	await cartPage.goto();
	// The page rendered the cart, so a missing push means the plugin chose not to.
	await expect( cartPage.emptyCartNotice ).toBeVisible();

	await dataLayer.expectNotPushed( 'view_cart' );
} );

test( 'view_cart cart_total is the total after a coupon discount @T36e192bf', async ( {
	cartPage,
	catalog,
	dataLayer,
	homePage,
	product,
	saleProduct,
} ) => {
	const coupon = await catalog.createCoupon( '10' );
	// 4 x 35.00 + 2 x 20.00 = 180.00 before the coupon.
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );

	await cartPage.goto();
	await cartPage.applyCoupon( coupon.code );
	// view_cart is printed when the page renders, so only a new load has the coupon.
	await cartPage.reload();
	const viewCart = await dataLayer.expectPushedOnce( 'view_cart' );

	expect( viewCart.event ).toBe( 'view_cart_stape' );
	// Pinned rather than computed: 180.00 - 10 %.
	expect( viewCart.cart_total ).toBe( '162.00' );
	// The discount shows in the totals only: each item keeps its own price.
	expect( viewCart.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( saleProduct.id ), price: '35.00' } ),
		expect.objectContaining( { item_id: String( product.id ), price: '20.00' } ),
	] );
} );

test( 'view_cart cart_total includes tax when prices are entered inclusive of tax @T201776b1', async ( {
	cartPage,
	catalog,
	category,
	dataLayer,
	homePage,
	storeOptions,
} ) => {
	await storeOptions( { calcTaxes: 'yes', pricesIncludeTax: 'yes' } );
	// In a tax class of its own, so it taxes this test's product only.
	const tax = await catalog.createTaxRate( { country: 'US', rate: '25' } );
	// 20.00 inclusive of tax: 16.00 net + 4.00 tax.
	const product = await catalog.createProduct( category, { tax_class: tax.taxClass } );
	await homePage.addToCart( product );

	await cartPage.goto();
	// The case's step 1: the cart itself is taxed the way the case expects.
	await expect( cartPage.totalsAmount( tax.name ) ).toHaveText( '$4.00' );
	await expect( cartPage.totalsAmount( 'Estimated total' ) ).toHaveText( '$20.00' );
	const viewCart = await dataLayer.expectPushedOnce( 'view_cart' );

	expect( viewCart.event ).toBe( 'view_cart_stape' );
	// Gross, not the 16.00 net.
	expect( viewCart.cart_total ).toBe( '20.00' );
} );
