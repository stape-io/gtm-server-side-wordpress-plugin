import { expect } from '@playwright/test';
import type { CreatedProduct } from '../api/products';
import type { CartState, CartStateLine, Ecommerce, EcommerceItem } from './types';

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

/** One `ecommerce.items` entry for a product created by the `product` fixture. */
export function expectedItem(
	product: CreatedProduct,
	extra: Pick< EcommerceItem, 'quantity' | 'index' > = {}
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

/** `ecommerce` for the given items; `value` is price x quantity (1 when absent). */
export function expectedEcommerce( items: EcommerceItem[] ): Ecommerce {
	const value = items.reduce(
		( sum, item ) => sum + Number( item.price ) * ( item.quantity ?? 1 ),
		0
	);
	return { currency: STORE_CURRENCY, value: value.toFixed( 2 ), items };
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
