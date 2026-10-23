import type { Request } from '@playwright/test';
import type { CreatedPage } from '../api/pages';
import { ProductListing } from './product-listing';

/** A POST the page sent: its path and query, and the admin-ajax `action` it posted, if any. */
export type SentPost = { path: string; action?: string };

/** Posted by the frontend script to fetch `cart_state` (see _sendStateCartDataAjax()). */
export const CART_STATE_ACTION = 'gtm_server_side_state_cart_data';

function sentPost( request: Request ): SentPost {
	const url = new URL( request.url() );
	const action = new URLSearchParams( request.postData() ?? '' ).get( 'action' );
	return { path: url.pathname + url.search, ...( action ? { action } : {} ) };
}

/**
 * A page holding the classic product loop (`[products]`), in the block theme:
 * WooCommerce's own `wc-add-to-cart.js` adds over `wc-ajax=add_to_cart`.
 */
export class ClassicLoopPage extends ProductListing {
	async goto( loopPage: CreatedPage ) {
		await this.page.goto( loopPage.link );
	}

	/**
	 * Clicks "Add to cart" and returns the POSTs the page sent from the click
	 * up to the plugin's `cart_state` request, in order. That request is the
	 * last one an add_to_cart waits for before it is pushed.
	 */
	async addToCartRecordingPosts( productName: string ): Promise< SentPost[] > {
		const posts: SentPost[] = [];
		const record = ( request: Request ) => {
			if ( request.method() === 'POST' ) {
				posts.push( sentPost( request ) );
			}
		};
		this.page.on( 'request', record );
		try {
			const cartState = this.page.waitForRequest(
				( request ) => request.method() === 'POST' && sentPost( request ).action === CART_STATE_ACTION
			);
			await this.addToCart( productName );
			await cartState;
		} finally {
			this.page.off( 'request', record );
		}
		return posts;
	}
}
