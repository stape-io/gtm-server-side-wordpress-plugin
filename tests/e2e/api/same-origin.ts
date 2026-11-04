import type { APIRequestContext } from '@playwright/test';

/**
 * Turns the same-origin proxy back on, with no API key, the way
 * bin/wp-env-configure.sh leaves it, through mu-plugins/same-origin-baseline.php:
 * wp-admin can't save the proxy on without a key. The plugin writes the proxy
 * path's rewrite rule back at the end of that request.
 */
export async function restoreSameOriginBaseline( request: APIRequestContext ): Promise< void > {
	const response = await request.get( '/?gtm-e2e-same-origin-baseline=1' );
	if ( ! response.ok() || ( await response.json().catch( () => null ) )?.enable !== 'yes' ) {
		throw new Error(
			`Could not turn the same-origin proxy back on (${ response.status() }): is mu-plugins/same-origin-baseline.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start.`
		);
	}
}
