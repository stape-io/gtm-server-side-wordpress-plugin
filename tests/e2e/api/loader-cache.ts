import type { APIRequestContext } from '@playwright/test';

/**
 * The plugin's cache of the identifier's random prefix and the encoded Web GTM
 * ID, read and cleared through mu-plugins/loader-cache.php. A request carrying
 * the plugin's cookie gets the test's own copy, one without it the site's
 * transients, which is what WP-CLI's `wp transient get` reads.
 */

/** Read by mu-plugins/loader-cache.php; the PHP side names it GTM_SERVER_SIDE_E2E_LOADER_CACHE_COOKIE. */
export const LOADER_CACHE_COOKIE = 'gtm_e2e_loader_cache';

/** The two cached values, null when not set (`wp transient get` warns "is not set"). */
export type LoaderCacheValues = {
	/** `gtm_server_side_web_identifier__generated`: the prefix and the identifier. */
	identifier: string | null;
	/** `gtm_server_side_web_container_id__generated`: `<R>=<encoded Web GTM ID>&<E>`. */
	containerId: string | null;
};

type Answer = Record< 'gtm_server_side_web_identifier__generated' | 'gtm_server_side_web_container_id__generated', string | null >;

async function call(
	request: APIRequestContext,
	action: 'read' | 'delete',
	scope?: string
): Promise< LoaderCacheValues > {
	const response = await request.get( `/?gtm-e2e-loader-cache=${ action }`, {
		headers: scope ? { Cookie: `${ LOADER_CACHE_COOKIE }=${ scope }` } : {},
	} );
	if ( ! response.ok() || ! response.headers()[ 'content-type' ]?.includes( 'application/json' ) ) {
		throw new Error(
			`The loader cache answered ${ response.status() }: is mu-plugins/loader-cache.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start.`
		);
	}
	const answer: Answer = await response.json();
	return {
		identifier: answer.gtm_server_side_web_identifier__generated,
		containerId: answer.gtm_server_side_web_container_id__generated,
	};
}

/** The cached values, for the cookies `request` carries. */
export function readLoaderCache( request: APIRequestContext ): Promise< LoaderCacheValues > {
	return call( request, 'read' );
}

/** Deletes every test's own copy of the cache, the ones killed runs left behind. */
export async function purgeLoaderCaches( request: APIRequestContext ): Promise< void > {
	const response = await request.get( '/?gtm-e2e-loader-cache=purge' );
	if ( ! response.ok() || ! response.headers()[ 'content-type' ]?.includes( 'application/json' ) ) {
		throw new Error(
			`The loader cache answered ${ response.status() }: is mu-plugins/loader-cache.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start.`
		);
	}
}

/** Clears the cached values: `scope`'s copy, or without one, for the cookies `request` carries. */
export async function clearLoaderCache( request: APIRequestContext, scope?: string ): Promise< void > {
	await call( request, 'delete', scope );
}
