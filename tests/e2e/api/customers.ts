import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { uniqueSuffix } from './products';

/**
 * Shoppers the specs type into the checkout or the My Account Register form.
 * Nothing is created over REST: a guest exists only in the WooCommerce
 * session of the test's browser, and an account only once the browser
 * registers it.
 */

/** Every guest email starts with this, which is what purgeTestOrders() looks for. */
export const GUEST_EMAIL_PREFIX = 'e2e-guest-';

/** Every email a test registers on My Account starts with this, which is what purgeTestAccounts() looks for. */
const CUSTOMER_EMAIL_PREFIX = 'e2e-customer-';

/** A shopper who registers on My Account: the form asks for the email only. */
export type NewCustomer = {
	email: string;
};

export type BillingDetails = {
	email: string;
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	postcode: string;
};

/**
 * A guest buyer in the store's own country (US), so Country and State keep
 * their defaults. The email is unique per call: WooCommerce tells a new
 * customer from a returning one by it, so tests running in parallel must
 * never share one.
 */
export function buildGuestBuyer(): BillingDetails {
	const unique = uniqueSuffix();
	return {
		email: `${ GUEST_EMAIL_PREFIX }${ unique }@example.test`,
		firstName: 'E2E Guest',
		lastName: `Buyer ${ unique }`,
		address: '1 Market St',
		city: 'San Francisco',
		postcode: '94105',
	};
}

/** A shopper to register, with an email unique per call, like a guest buyer's. */
export function buildNewCustomer(): NewCustomer {
	return { email: `${ CUSTOMER_EMAIL_PREFIX }${ uniqueSuffix() }@example.test` };
}

/*
 * Accounts the browser registers, on My Account or at checkout. REST never
 * creates them, so they are found again by email, which is unique per test.
 */

type FoundAccount = { id: number; email: string };

/** The accounts whose email starts with `email`, whatever their role. */
async function findAccounts( requestUtils: RequestUtils, email: string ): Promise< number[] > {
	const found: FoundAccount[] = await requestUtils.rest( {
		path: '/wc/v3/customers',
		params: { search: email, role: 'all', per_page: 100 },
	} );
	// The search matches other fields too: keep only what the email says.
	return found.filter( ( account ) => account.email.startsWith( email ) ).map( ( account ) => account.id );
}

async function deleteAccount( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/customers/${ id }`, method: 'DELETE', params: { force: 'true' } } );
}

/** Deletes the account registered with this email, if the test registered one. */
export async function deleteAccountsOf( requestUtils: RequestUtils, email: string ): Promise< void > {
	await Promise.all( ( await findAccounts( requestUtils, email ) ).map( ( id ) => deleteAccount( requestUtils, id ) ) );
}

/** Deletes every account a previous run left behind (see purgeTestCatalog()). */
export async function purgeTestAccounts( requestUtils: RequestUtils ): Promise< void > {
	for ( const prefix of [ GUEST_EMAIL_PREFIX, CUSTOMER_EMAIL_PREFIX ] ) {
		const leftovers = () => findAccounts( requestUtils, prefix );
		for ( let ids = await leftovers(); ids.length; ids = await leftovers() ) {
			await Promise.all( ids.map( ( id ) => deleteAccount( requestUtils, id ) ) );
		}
	}
}
