import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * The site-wide state an exclusive test may change, read and put back through
 * mu-plugins/site-state.php: the plugin's options and transients, the rewrite
 * rules, the active plugins and the plugin's cron events. The siteState
 * fixture hands it back unchanged; readStoredOption() reads one option's
 * stored value from it.
 */
export type SiteState = {
	options: Record< string, [ value: string, autoload: string ] >;
	cron: Record< string, unknown >;
};

/** The options readStoredOption() can read: the plugin's, which the state covers. */
export type PluginOptionName = `gtm_server_side_${ string }`;

const PATH = '/gtm-e2e/v1/site-state';

async function call( requestUtils: RequestUtils, method: 'GET' | 'PUT', data?: SiteState ): Promise< SiteState > {
	try {
		return await requestUtils.rest( { path: PATH, method, data } );
	} catch ( error ) {
		throw new Error(
			`Cannot ${ method === 'GET' ? 'read' : 'restore' } the site state: is mu-plugins/site-state.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start. ${ String( error ) }`
		);
	}
}

/** The state now. */
export function readSiteState( requestUtils: RequestUtils ): Promise< SiteState > {
	return call( requestUtils, 'GET' );
}

/**
 * One of the plugin's options as the database holds it (serialized, as
 * `wp option get` would print a string), or undefined when there is no such
 * row: `wp option get`'s "Could not get … Does it exist?". Only options the
 * state covers (`gtm_server_side_*`).
 */
export async function readStoredOption( requestUtils: RequestUtils, name: PluginOptionName ): Promise< string | undefined > {
	return ( await readSiteState( requestUtils ) ).options[ name ]?.[ 0 ];
}

/** Puts `state` back, and returns the state after it. */
export function restoreSiteState( requestUtils: RequestUtils, state: SiteState ): Promise< SiteState > {
	return call( requestUtils, 'PUT', state );
}
