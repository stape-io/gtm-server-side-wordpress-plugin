import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * The site-wide state a serial test may change, read and put back through
 * mu-plugins/site-state.php: the plugin's options and transients, the rewrite
 * rules, the active plugins and the plugin's cron events. Opaque to the
 * specs: the siteState fixture reads it and hands the same value back.
 */
export type SiteState = {
	options: Record< string, [ value: string, autoload: string ] >;
	cron: Record< string, unknown >;
};

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

/** Puts `state` back, and returns the state after it. */
export function restoreSiteState( requestUtils: RequestUtils, state: SiteState ): Promise< SiteState > {
	return call( requestUtils, 'PUT', state );
}
