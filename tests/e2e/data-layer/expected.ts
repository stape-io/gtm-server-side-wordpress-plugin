import { expect } from '@playwright/test';
import type { CreatedCustomer } from '../api/customers';
import type { CreatedCategory, CreatedProduct, CreatedVariation } from '../api/products';
import type { CartState, CartStateLine, DataLayerEvent, Ecommerce, EcommerceItem } from './types';

/**
 * Expected payloads, built from what the fixtures created. Specs compare them
 * with `toEqual`, so a field the plugin starts or stops sending fails there.
 *
 * Builders map fixture data onto the payload shape and nothing more: anything
 * the plugin itself computes (index, quantity) is passed in by the spec, so a
 * builder can never share a bug with the code it checks.
 */

/** bin/wp-env-configure.sh sets it, tests/e2e/setup/preflight.setup.ts checks it. */
export const STORE_CURRENCY = 'USD';

/** Values the store, not the plugin, picks per visitor. */
const ANY_CART_ID = expect.any( String ) as unknown as string;

/**
 * One `ecommerce.items` entry for a product the fixtures created. `price` in
 * `extra` replaces the product's own when the case pins it to another
 * fixture's (a variable product's cheapest variation), and the category
 * fields replace the product's own category when it is a subcategory, whose
 * chain the plugin reports from the top.
 */
export function expectedItem(
	product: CreatedProduct,
	extra: Pick< EcommerceItem, 'quantity' | 'index' | 'price' | 'item_category' | 'item_category2' | 'discount' > = {}
): EcommerceItem {
	return {
		item_id: String( product.id ),
		item_name: product.name,
		item_sku: product.sku,
		// Empty rather than absent: the fixture creates a bare product.
		item_brand: '',
		item_category: product.category.name,
		price: product.price,
		imageUrl: '',
		...extra,
	};
}

/**
 * One `ecommerce.items` entry for a variation of a variable product the
 * fixtures created: the variation's own id, SKU and regular price (the
 * fixture puts no variation on sale), and the parent's category. Its name
 * and `item_variant` are what WooCommerce and the plugin made of the chosen
 * attributes, so the spec passes them in.
 */
export function expectedVariationItem(
	product: CreatedProduct,
	variation: CreatedVariation,
	extra: Required< Pick< EcommerceItem, 'item_name' | 'item_variant' > > & Pick< EcommerceItem, 'quantity' | 'index' >
): EcommerceItem {
	return {
		item_id: String( variation.id ),
		item_sku: variation.sku,
		item_brand: '',
		item_category: product.category.name,
		price: variation.regular_price,
		imageUrl: '',
		...extra,
	};
}

/** `ecommerce` for the given items; `value` is price x quantity (1 when absent). */
export function expectedEcommerce( items: EcommerceItem[] ): Ecommerce {
	const value = items.reduce(
		( sum, item ) => sum + Number( item.price ) * ( item.quantity ?? 1 ),
		0
	);
	return { currency: STORE_CURRENCY, value: value.toFixed( 2 ), items };
}

/**
 * One view_item_list item: the product, plus the list it was shown in.
 * `extra` as for expectedItem().
 */
export function expectedListItem(
	product: CreatedProduct,
	list: CreatedCategory,
	extra: Parameters< typeof expectedItem >[ 1 ] = {}
): EcommerceItem {
	return { ...expectedItem( product, extra ), item_list_id: list.id, item_list_name: list.name };
}

/** view_item_list's `ecommerce`: a list has no `value`. */
export function expectedItemListEcommerce( items: EcommerceItem[] ): Ecommerce {
	return { currency: STORE_CURRENCY, items };
}

/**
 * The event without its `cart_state`. The event specs compare everything else
 * with `toEqual`, and leave `cart_state` to the cases written for it (the Data
 * layer - cart_state folder in Testomat), so that one change to it does not
 * fail every event spec at once.
 */
export function withoutCartState( event: DataLayerEvent ): Omit< DataLayerEvent, 'cart_state' > {
	const { cart_state: _cartState, ...rest } = event;
	return rest;
}

/** One `cart_state.lines` entry. */
export function expectedCartLine( product: CreatedProduct, quantity: number ): CartStateLine {
	return {
		item_id: String( product.id ),
		item_name: product.name,
		item_sku: product.sku,
		item_variant: '',
		price: product.price,
		line_total_price: ( Number( product.price ) * quantity ).toFixed( 2 ),
		quantity,
	};
}

/** `cart_state` holding exactly these lines; `[]` for an empty cart. */
export function expectedCartState( lines: CartStateLine[] ): CartState {
	return {
		cart_id: ANY_CART_ID,
		cart_quantity: lines.reduce( ( sum, line ) => sum + ( line.quantity ?? 0 ), 0 ),
		cart_value: lines
			.reduce( ( sum, line ) => sum + Number( line.line_total_price ), 0 )
			.toFixed( 2 ),
		currency: STORE_CURRENCY,
		lines,
	};
}

/**
 * `user_data` of a logged-in customer's non-purchase events: the account's
 * profile and billing fields, every value a string. The fixture stores no
 * company, second address line or shipping address, which the plugin leaves
 * out as empty.
 */
export function expectedUserData( customer: CreatedCustomer ): Record< string, string > {
	return {
		customer_id: String( customer.id ),
		email: customer.email,
		first_name: customer.firstName,
		last_name: customer.lastName,
		billing_first_name: customer.firstName,
		billing_last_name: customer.lastName,
		billing_address: customer.billing.address,
		billing_postcode: customer.billing.postcode,
		billing_country: customer.billing.country,
		billing_state: customer.billing.state,
		billing_city: customer.billing.city,
		billing_email: customer.email,
		billing_phone: customer.billing.phone,
	};
}

/**
 * `user_data` of the purchase a logged-in customer placed with the address
 * the checkout filled in from the account, for both billing and shipping,
 * and `billingEmail` as the contact email. `newCustomer` is what the plugin
 * decides from the customer's order count, so the spec passes it in.
 */
export function expectedOrderUserData(
	customer: CreatedCustomer,
	{ billingEmail, newCustomer }: { billingEmail: string; newCustomer: 'true' | 'false' }
): Record< string, string > {
	const { address, postcode, country, state, city, phone } = customer.billing;
	return {
		customer_id: String( customer.id ),
		billing_first_name: customer.firstName,
		billing_last_name: customer.lastName,
		billing_address: address,
		billing_postcode: postcode,
		billing_country: country,
		billing_state: state,
		billing_city: city,
		billing_email: billingEmail,
		billing_phone: phone,
		shipping_first_name: customer.firstName,
		shipping_last_name: customer.lastName,
		shipping_address: address,
		shipping_postcode: postcode,
		shipping_country: country,
		shipping_state: state,
		shipping_city: city,
		shipping_phone: phone,
		email: customer.email,
		first_name: customer.firstName,
		last_name: customer.lastName,
		new_customer: newCustomer,
	};
}
