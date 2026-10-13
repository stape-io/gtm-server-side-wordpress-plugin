/**
 * The shape of what this plugin pushes to window.dataLayer, written against
 * captured payloads.
 *
 * Fields are optional because the plugin emits a different subset per event,
 * so these types give autocomplete and catch misspelled field names, but do
 * not enforce the contract: the exact `toEqual` assertions in the specs do.
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
 * Attached to events when the custom event name suffix is on. Built server
 * side by GTM_Server_Side_State_Helpers::get_cart_data(): printed with the
 * PHP-rendered events (view_item, view_cart, ...), and fetched over admin-ajax
 * for add_to_cart (_pushWithStateCartData() in assets/js/javascript.js).
 */
export type CartState = {
	cart_id?: string;
	cart_quantity?: number;
	cart_value?: string;
	currency?: string;
	lines?: CartStateLine[];
};

/**
 * One dataLayer entry. Keeps an index signature, unlike the types above: the
 * array is shared with Google Tag Manager, so it also holds entries such as
 * `gtm.js` whose keys we don't own.
 */
export type DataLayerEvent = {
	event?: string;
	ecomm_pagetype?: string;
	ecommerce?: Ecommerce | null;
	cart_state?: CartState;
	/** Present only with user data on; `[]` for a guest. */
	user_data?: Record< string, unknown > | [];
	[ key: string ]: unknown;
};
