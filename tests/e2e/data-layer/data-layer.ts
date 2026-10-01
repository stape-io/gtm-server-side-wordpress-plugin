import { expect, type Page } from '@playwright/test';
import type { DataLayerEvent } from './types';
import type { PluginConfig } from '../types/plugin-config';

/**
 * How long to keep watching after the first matching push before counting.
 * A duplicate push (say, two click handlers bound to the same button) lands
 * within the same tick or the same fallback timer as the original one, so
 * this only needs to cover a few event-loop turns and an admin-ajax round trip.
 */
const LATE_PUSH_GRACE_MS = 500;

type Snapshot = {
	/** `eventName` as the plugin names it on this page, suffix included. */
	fullName: string;
	/** Every named event pushed so far, in order. */
	pushed: string[];
	matches: DataLayerEvent[];
};

/**
 * Driver for window.dataLayer: the one place that knows how the plugin names
 * its events and what counts as a match.
 *
 * Specs name the bare event (`add_to_cart`); the suffix is resolved the way
 * getDataLayerEventName() in assets/js/javascript.js does it, from the
 * `varGtmServerSide` config the plugin localizes into the page. Matching is
 * exact, not by prefix, so `view_item` never picks up `view_item_list`.
 */
export class DataLayer {
	constructor( private readonly page: Page ) {}

	/**
	 * Waits for `eventName` to be pushed, then asserts it was pushed exactly
	 * once and returns it. Duplicate pushes are the most common tracking bug,
	 * so "exactly once" is part of every event assertion rather than opt-in.
	 *
	 * Waits rather than snapshotting: the plugin can defer add_to_cart behind
	 * a 1500 ms fallback timer plus an admin-ajax round trip for `cart_state`
	 * (_pushWithStateCartData() in assets/js/javascript.js).
	 */
	async expectPushedOnce( eventName: string ): Promise< DataLayerEvent > {
		const { fullName } = await this.snapshot( eventName );

		// On timeout, the failure message lists what was pushed instead.
		await expect
			.poll( async () => ( await this.snapshot( eventName ) ).pushed, {
				message: `dataLayer event "${ fullName }" was never pushed`,
			} )
			.toContain( fullName );

		await this.page.waitForTimeout( LATE_PUSH_GRACE_MS );

		const { matches } = await this.snapshot( eventName );
		expect( matches, `dataLayer event "${ fullName }" pushed more than once` ).toHaveLength( 1 );

		return matches[ 0 ];
	}

	private async snapshot( eventName: string ): Promise< Snapshot > {
		const snapshot = await this.page.evaluate( ( name ) => {
			const w = window as unknown as {
				dataLayer?: DataLayerEvent[];
				varGtmServerSide?: PluginConfig;
			};
			if ( ! w.varGtmServerSide ) {
				return null;
			}

			const { is_custom_event_name, DATA_LAYER_CUSTOM_EVENT_NAME } = w.varGtmServerSide;
			const fullName = is_custom_event_name === 'yes' ? name + DATA_LAYER_CUSTOM_EVENT_NAME : name;
			const events = w.dataLayer ?? [];

			return {
				fullName,
				pushed: events
					.map( ( entry ) => entry.event )
					.filter( ( event ): event is string => typeof event === 'string' ),
				matches: events.filter( ( entry ) => entry.event === fullName ),
			};
		}, eventName );

		if ( ! snapshot ) {
			throw new Error(
				`Cannot resolve the dataLayer event "${ eventName }": this page has no varGtmServerSide, so the plugin's frontend script did not load here.`
			);
		}

		return snapshot;
	}
}
