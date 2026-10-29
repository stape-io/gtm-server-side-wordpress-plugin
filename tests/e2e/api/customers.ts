import { randomUUID } from 'node:crypto';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { uniqueSuffix } from './products';

/**
 * Shoppers the specs type into the checkout or the My Account Register form,
 * and registered customers created over REST for the cases that start logged
 * in. A guest exists only in the WooCommerce session of the test's browser,
 * and a registered shopper's account only once the browser registers it.
 */

/** Every guest email starts with this, which is what purgeTestOrders() looks for. */
export const GUEST_EMAIL_PREFIX = 'e2e-guest-';

/**
 * Every email a test registers on My Account, or creates a customer with,
 * starts with this, which is what purgeTestAccounts() and purgeTestOrders()
 * look for.
 */
export const CUSTOMER_EMAIL_PREFIX = 'e2e-customer-';

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

/**
 * A customer account created over REST, with a billing address in the store's
 * own country and no shipping address. Billing names are the account's.
 */
export type CreatedCustomer = {
	id: number;
	email: string;
	/** For the My Account login form. */
	password: string;
	firstName: string;
	lastName: string;
	billing: {
		address: string;
		city: string;
		postcode: string;
		state: string;
		country: string;
		phone: string;
	};
};

/** A customer with an email unique per call, like a guest buyer's. */
export async function createCustomer( requestUtils: RequestUtils ): Promise< CreatedCustomer > {
	const unique = uniqueSuffix();
	const customer: Omit< CreatedCustomer, 'id' > = {
		email: `${ CUSTOMER_EMAIL_PREFIX }${ unique }@example.test`,
		password: randomUUID(),
		firstName: 'E2E Customer',
		lastName: `Shopper ${ unique }`,
		billing: {
			address: '5 Market St',
			city: 'San Francisco',
			postcode: '94105',
			state: 'CA',
			country: 'US',
			phone: '4155550199',
		},
	};
	const created: { id: number } = await requestUtils.rest( {
		path: '/wc/v3/customers',
		method: 'POST',
		data: {
			email: customer.email,
			password: customer.password,
			first_name: customer.firstName,
			last_name: customer.lastName,
			billing: {
				first_name: customer.firstName,
				last_name: customer.lastName,
				address_1: customer.billing.address,
				city: customer.billing.city,
				postcode: customer.billing.postcode,
				state: customer.billing.state,
				country: customer.billing.country,
				email: customer.email,
				phone: customer.billing.phone,
			},
		},
	} );
	return { id: created.id, ...customer };
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

export async function deleteAccount( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/customers/${ id }`, method: 'DELETE', params: { force: 'true' } } );
}

/** The ID of the account registered with this email, as `wp user get <email> --field=ID` prints it. */
export async function findAccountId( requestUtils: RequestUtils, email: string ): Promise< number > {
	const [ id, ...others ] = await findAccounts( requestUtils, email );
	if ( id === undefined || others.length ) {
		throw new Error( `Expected one account registered with ${ email }, found ${ others.length + ( id === undefined ? 0 : 1 ) }.` );
	}
	return id;
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
