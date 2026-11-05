import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * The HTTP requests WordPress sent while serving one test's browser requests,
 * recorded by mu-plugins/record-outgoing-http.php under the test's token.
 */

/** Read by mu-plugins/record-outgoing-http.php; the PHP side names it GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_COOKIE. */
export const OUTGOING_HTTP_COOKIE = 'gtm_e2e_outgoing_http';

/** One request WordPress sent, as wp_remote_*() was given it. */
export type OutgoingRequest = {
	url: string;
	method: string;
	/** As the caller passed them: a name => value map, or none. */
	headers: Record< string, string > | [];
	/** The body as sent: a string (JSON, for the plugin's webhooks), a form's fields, or null. */
	body: string | Record< string, unknown > | null;
	/**
	 * What answered it: the status code a test plugin answered with (200 for a
	 * test host, *.stape.test, that nothing else answers), the error one
	 * returned (block-stape-api.php's), or null when it went out to the network.
	 */
	answer: number | string | null;
};

async function call< T >( requestUtils: RequestUtils, path: string, method: 'GET' | 'DELETE' ): Promise< T > {
	try {
		return await requestUtils.rest( { path, method } );
	} catch ( error ) {
		throw new Error(
			`Cannot read the outgoing HTTP requests tests recorded: is mu-plugins/record-outgoing-http.php loaded? After a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start. ${ String( error ) }`
		);
	}
}

/** The requests recorded under `token`, oldest first. */
export function readOutgoingHttp( requestUtils: RequestUtils, token: string ): Promise< OutgoingRequest[] > {
	return call( requestUtils, `/gtm-e2e/v1/outgoing-http/${ token }`, 'GET' );
}

/** Deletes the requests recorded under `token`. */
export async function deleteOutgoingHttp( requestUtils: RequestUtils, token: string ): Promise< void > {
	await call( requestUtils, `/gtm-e2e/v1/outgoing-http/${ token }`, 'DELETE' );
}

/** Deletes every test's records: the ones killed runs left behind. */
export async function purgeOutgoingHttp( requestUtils: RequestUtils ): Promise< void > {
	await call( requestUtils, '/gtm-e2e/v1/outgoing-http', 'DELETE' );
}
