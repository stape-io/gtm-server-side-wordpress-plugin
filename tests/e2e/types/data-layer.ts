/**
 * The shape of what this plugin pushes to window.dataLayer.
 *
 * Written against a captured `add_to_cart` payload, not from reading the
 * source, so the field names here are the ones the plugin actually emits.
 *
 * Note the deliberate absence of `[key: string]: unknown` on everything
 * except DataLayerEvent: an index signature makes every typo compile, which
 * would leave these types as documentation that cannot be wrong because it
 * never checks anything. Fields stay optional (the plugin emits different
 * subsets per event) but unknown names are now a compile error.
 */

/** One entry in `ecommerce.items`. `price` is a string - javascript.js runs it through toFixed(2). */
export type EcommerceItem = {
	item_id?: string;
	item_name?: string;
	item_sku?: string;
	item_brand?: string;
	item_category?: string;
	item_variant?: string;
	price?: string;
	quantity?: number;
	index?: number;
	/** camelCase: derived from the data-gtm_image-url attribute. */
	imageUrl?: string;
};

export type Ecommerce = {
	currency?: string;
	value?: string;
	items?: EcommerceItem[];
};

/** One entry in `cart_state.lines`. */
export type CartStateLine = {
	item_id?: string;
	item_name?: string;
	item_sku?: string;
	item_variant?: string;
	price?: string;
	line_total_price?: string;
	quantity?: number;
};

/**
 * Pushed alongside add_to_cart only when the custom event name suffix is on -
 * see _pushWithStateCartData() in assets/js/javascript.js, which fetches it
 * from the gtm_server_side_state_cart_data admin-ajax action. Server-side
 * shape comes from GTM_Server_Side_State_Helpers::get_cart_data().
 */
export type CartState = {
	cart_id?: string;
	cart_quantity?: number;
	cart_value?: string;
	currency?: string;
	lines?: CartStateLine[];
};

/**
 * One dataLayer entry.
 *
 * This one keeps an index signature on purpose: the array is shared with
 * Google Tag Manager itself, so it holds foreign entries (`gtm.js`, `gtm.dom`)
 * whose keys we neither own nor want to enumerate.
 */
export type DataLayerEvent = {
	event?: string;
	ecomm_pagetype?: string;
	ecommerce?: Ecommerce | null;
	cart_state?: CartState;
	user_data?: Record< string, unknown >;
	[ key: string ]: unknown;
};
