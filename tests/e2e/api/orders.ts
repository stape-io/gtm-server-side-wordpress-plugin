import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { CUSTOMER_EMAIL_PREFIX, GUEST_EMAIL_PREFIX } from './customers';

/**
 * Orders a test places through the checkout. The browser creates them, not
 * REST, so they are found again by the guest buyer's email, which is unique
 * per test (buildGuestBuyer()), or by the customer who placed them.
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

/** Deletes every order the customer with this ID placed, whatever its billing email. */
export async function deleteOrdersOfCustomer( requestUtils: RequestUtils, customerId: number ): Promise< void > {
	const found: Array< { id: number } > = await requestUtils.rest( {
		path: '/wc/v3/orders',
		params: { customer: customerId, status: 'any', per_page: 100 },
	} );
	await Promise.all( found.map( ( { id } ) => deleteOrder( requestUtils, id ) ) );
}

/**
 * Deletes every order a previous run left behind (see purgeTestCatalog()):
 * a guest's, and a test customer's placed with the account's own email.
 */
export async function purgeTestOrders( requestUtils: RequestUtils ): Promise< void > {
	for ( const prefix of [ GUEST_EMAIL_PREFIX, CUSTOMER_EMAIL_PREFIX ] ) {
		const leftovers = () => findOrders( requestUtils, prefix );
		for ( let ids = await leftovers(); ids.length; ids = await leftovers() ) {
			await Promise.all( ids.map( ( id ) => deleteOrder( requestUtils, id ) ) );
		}
	}
}
