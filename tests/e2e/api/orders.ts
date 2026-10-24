import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { GUEST_EMAIL_PREFIX } from './customers';

/**
 * Orders a test places through the checkout. The browser creates them, not
 * REST, so they are found again by the guest buyer's email, which is unique
 * per test (buildGuestBuyer()).
 */

type FoundOrder = { id: number; billing: { email: string } };

/** The orders whose billing email starts with `email`, in any status. */
async function findOrders( requestUtils: RequestUtils, email: string ): Promise< number[] > {
	const found: FoundOrder[] = await requestUtils.rest( {
		path: '/wc/v3/orders',
		params: { search: email, status: 'any', per_page: 100 },
	} );
	// The search matches other fields too: keep only what the email says.
	return found.filter( ( order ) => order.billing.email.startsWith( email ) ).map( ( order ) => order.id );
}

export async function deleteOrder( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/orders/${ id }`, method: 'DELETE', params: { force: 'true' } } );
}

/** Sets an order's status the way the store admin would, which runs WooCommerce's status hooks. */
export async function setOrderStatus( requestUtils: RequestUtils, id: number, status: string ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/orders/${ id }`, method: 'PUT', data: { status } } );
}

/** Deletes every order placed with this billing email. */
export async function deleteOrdersOf( requestUtils: RequestUtils, email: string ): Promise< void > {
	await Promise.all( ( await findOrders( requestUtils, email ) ).map( ( id ) => deleteOrder( requestUtils, id ) ) );
}

/** Deletes every guest order a previous run left behind (see purgeTestCatalog()). */
export async function purgeTestOrders( requestUtils: RequestUtils ): Promise< void > {
	const leftovers = () => findOrders( requestUtils, GUEST_EMAIL_PREFIX );
	for ( let ids = await leftovers(); ids.length; ids = await leftovers() ) {
		await Promise.all( ids.map( ( id ) => deleteOrder( requestUtils, id ) ) );
	}
}
