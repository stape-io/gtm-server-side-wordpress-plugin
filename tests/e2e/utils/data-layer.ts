import type { Page } from '@playwright/test';
import type { DataLayerEvent } from '../types/data-layer';

/**
 * Returns the raw window.dataLayer array pushed by assets/js/javascript.js.
 * Internal: only the timeout path below needs it, to say what did arrive.
 */
async function getDataLayer( page: Page ): Promise< DataLayerEvent[] > {
	return page.evaluate(
		() => ( window as unknown as { dataLayer?: DataLayerEvent[] } ).dataLayer ?? []
	);
}

/**
 * Event names carry a configurable suffix - `view_item` vs `view_item_stape`,
 * see getDataLayerEventName() in assets/js/javascript.js - so specs name the
 * bare event and the suffix is resolved here, from the
 * DATA_LAYER_CUSTOM_EVENT_NAME the plugin localizes into the page.
 *
 * Deliberately an exact match against `name` and `name + suffix`, not a prefix
 * match: `view_item` is a prefix of `view_item_list`, so a prefix match would
 * quietly hand a category page's view_item_list to a spec asking for
 * view_item, and the assertions that followed would be judging the wrong
 * event.
 */
async function findInPage( page: Page, eventName: string ): Promise< DataLayerEvent | undefined > {
	return page.evaluate( ( name ) => {
		const w = window as unknown as {
			dataLayer?: DataLayerEvent[];
			varGtmServerSide?: { DATA_LAYER_CUSTOM_EVENT_NAME?: string };
		};
		const suffix = w.varGtmServerSide?.DATA_LAYER_CUSTOM_EVENT_NAME ?? '';
		return ( w.dataLayer ?? [] ).find(
			( entry ) => entry.event === name || entry.event === name + suffix
		);
	}, eventName );
}

/**
 * Waits for an event to show up, then returns it.
 *
 * A plain snapshot right after the click is a race: for `add_to_cart` the
 * plugin can defer the push behind an ajaxComplete listener with a 1500 ms
 * fallback timer plus a further admin-ajax round trip for `cart_state` (see
 * _pushWithStateCartData() in assets/js/javascript.js). Specs should say
 * "eventually this event appears", not "it is already there".
 *
 * On timeout it reports what it wanted and what the page actually pushed.
 * Playwright's own TimeoutError says only "waitForFunction exceeded 10000ms",
 * which reads the same whether the plugin pushed nothing, pushed the event
 * under a different name, or never loaded at all - three very different bugs.
 */
export async function waitForDataLayerEvent(
	page: Page,
	eventName: string,
	timeout = 10_000
): Promise< DataLayerEvent > {
	try {
		await page.waitForFunction(
			( name ) => {
				const w = window as unknown as {
					dataLayer?: Array< { event?: string } >;
					varGtmServerSide?: { DATA_LAYER_CUSTOM_EVENT_NAME?: string };
				};
				const suffix = w.varGtmServerSide?.DATA_LAYER_CUSTOM_EVENT_NAME ?? '';
				return ( w.dataLayer ?? [] ).some(
					( entry ) => entry.event === name || entry.event === name + suffix
				);
			},
			eventName,
			{ timeout }
		);
	} catch {
		const pushed = ( await getDataLayer( page ) )
			.map( ( entry ) => entry.event )
			.filter( ( name ): name is string => Boolean( name ) );

		throw new Error(
			`Timed out after ${ timeout }ms waiting for the dataLayer event "${ eventName }" (with or without the configured suffix).\n` +
				`Events actually pushed: ${ pushed.length ? pushed.join( ', ' ) : '(none)' }`
		);
	}

	// Guaranteed by the wait above.
	return ( await findInPage( page, eventName ) ) as DataLayerEvent;
}
