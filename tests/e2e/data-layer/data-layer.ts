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

/**
 * How long a case watches for a push that must not come, when it says so
 * ("wait 5 more seconds"). Leave it out to use LATE_PUSH_GRACE_MS (or, for
 * expectNotPushed(), not to wait at all).
 */
type QuietOptions = { quietMs?: number };

/**
 * What to look for: a bare event name (`add_to_cart`), or, for an entry the
 * plugin pushes without an event (home's `{ ecomm_pagetype: 'home' }`), its
 * `ecomm_pagetype`, which matches every entry with that value, events
 * included: only for a page type no event carries.
 */
type EntrySelector = string | { ecomm_pagetype: string };

type Snapshot = {
	/** The selector as failure messages name it, the event's suffix included. */
	label: string;
	/** The value looked for: the event name with its suffix, or the `ecomm_pagetype`. */
	value: string;
	/** That field of every entry pushed so far that has it, in order. */
	pushed: string[];
	matches: DataLayerEvent[];
	/** The entry pushed right before the first match, if any. */
	beforeFirstMatch: DataLayerEvent | undefined;
};

/**
 * Driver for window.dataLayer: the one place that knows how the plugin names
 * its events and what counts as a match.
 *
 * Specs name the bare event (`add_to_cart`); the suffix is resolved the way
 * getDataLayerEventName() in assets/js/javascript.js does it, from the
 * `varGtmServerSide` config the plugin localizes into the page. Matching is
 * exact, not by prefix, so `view_item` never picks up `view_item_list`.
 * An entry pushed without an event (home) is selected by its `ecomm_pagetype`.
 */
export class DataLayer {
	constructor( private readonly page: Page ) {}

	/**
	 * Waits for the entry `selector` names to be pushed, then asserts it was
	 * pushed exactly once and returns it. Duplicate pushes are the most common tracking bug,
	 * so "exactly once" is part of every event assertion rather than opt-in.
	 *
	 * Also asserts the entry right before it is `{ ecommerce: null }`, which
	 * the plugin pushes ahead of every ecommerce event so GTM doesn't merge the
	 * previous event's items into this one.
	 *
	 * Waits rather than snapshotting: the plugin can defer add_to_cart behind
	 * a 1500 ms fallback timer plus an admin-ajax round trip for `cart_state`
	 * (_pushWithStateCartData() in assets/js/javascript.js).
	 *
	 * `quietMs` replaces the grace period after the first push, for a case
	 * that waits longer for a duplicate. Called again after the event is in,
	 * it returns at once and only watches for that long.
	 */
	async expectPushedOnce( selector: EntrySelector, { quietMs = LATE_PUSH_GRACE_MS }: QuietOptions = {} ): Promise< DataLayerEvent > {
		const { label, value } = await this.snapshot( selector );

		// On timeout, the failure message lists what was pushed instead.
		await expect
			.poll( async () => ( await this.snapshot( selector ) ).pushed, {
				message: `dataLayer ${ label } was never pushed`,
			} )
			.toContain( value );

		// eslint-disable-next-line playwright/no-wait-for-timeout -- watching for a push that must NOT come; there is no event to wait on.
		await this.page.waitForTimeout( quietMs );

		const { matches, beforeFirstMatch } = await this.snapshot( selector );
		expect( matches, `dataLayer ${ label } pushed more than once` ).toHaveLength( 1 );
		expect(
			beforeFirstMatch,
			`dataLayer ${ label } is not preceded by { ecommerce: null }`
		).toEqual( { ecommerce: null } );

		return matches[ 0 ];
	}

	/**
	 * Asserts the entry `selector` names was not pushed on this page. For
	 * events the plugin prints into the page (view_item_list, view_cart, ...): their inline
	 * scripts run before the load event page.goto() waits for, so nothing is
	 * left to wait for. Without `quietMs`, not for JS-pushed events, which can
	 * come later.
	 *
	 * A page that never rendered pushes nothing either. This fails on a page
	 * without the plugin's config, and the spec shows the page did its work
	 * (its product grid, say) before calling it.
	 *
	 * With `quietMs`, it first watches for that long, for a JS push that must
	 * not come within the time the case gives it (a click that holds its
	 * add_to_cart, say).
	 */
	async expectNotPushed( selector: EntrySelector, { quietMs }: QuietOptions = {} ): Promise< void > {
		if ( quietMs ) {
			// eslint-disable-next-line playwright/no-wait-for-timeout -- watching for a push that must NOT come; there is no event to wait on.
			await this.page.waitForTimeout( quietMs );
		}
		const { label, matches } = await this.snapshot( selector );
		expect( matches, `dataLayer ${ label } was pushed` ).toEqual( [] );
	}

	/**
	 * The `varGtmServerSide` config the plugin localized into the page: the
	 * settings it rendered with, which the frontend script pushes from.
	 */
	async pluginConfig(): Promise< PluginConfig > {
		const config = await this.page.evaluate(
			() => ( window as unknown as { varGtmServerSide?: PluginConfig } ).varGtmServerSide
		);
		if ( ! config ) {
			throw new Error( "This page has no varGtmServerSide, so the plugin's frontend script did not load here." );
		}
		return config;
	}

	private async snapshot( selector: EntrySelector ): Promise< Snapshot > {
		const snapshot = await this.page.evaluate( ( sel ) => {
			const w = window as unknown as {
				dataLayer?: DataLayerEvent[];
				varGtmServerSide?: PluginConfig;
			};
			if ( ! w.varGtmServerSide ) {
				return null;
			}

			const { is_custom_event_name, DATA_LAYER_CUSTOM_EVENT_NAME } = w.varGtmServerSide;
			let field: 'event' | 'ecomm_pagetype', value: string, label: string;
			if ( typeof sel === 'string' ) {
				field = 'event';
				value = is_custom_event_name === 'yes' ? sel + DATA_LAYER_CUSTOM_EVENT_NAME : sel;
				label = `event "${ value }"`;
			} else {
				field = 'ecomm_pagetype';
				value = sel.ecomm_pagetype;
				label = `entry with ecomm_pagetype "${ value }"`;
			}
			const events = w.dataLayer ?? [];

			const matches = events.filter( ( entry ) => entry[ field ] === value );
			const first = events.findIndex( ( entry ) => entry[ field ] === value );

			return {
				label,
				value,
				pushed: events
					.map( ( entry ) => entry[ field ] )
					.filter( ( pushed ): pushed is string => typeof pushed === 'string' ),
				matches,
				beforeFirstMatch: first > 0 ? events[ first - 1 ] : undefined,
			};
		}, selector );

		if ( ! snapshot ) {
			throw new Error(
				`Cannot resolve the dataLayer selector ${ JSON.stringify( selector ) }: this page has no varGtmServerSide, so the plugin's frontend script did not load here.`
			);
		}

		return snapshot;
	}
}
