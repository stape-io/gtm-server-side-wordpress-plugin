import { uniqueSuffix } from './products';

/**
 * Shoppers the specs type into the checkout. Nothing is created over REST:
 * a guest exists only in the WooCommerce session of the test's browser.
 */

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
		email: `e2e-guest-${ unique }@example.test`,
		firstName: 'E2E Guest',
		lastName: `Buyer ${ unique }`,
		address: '1 Market St',
		city: 'San Francisco',
		postcode: '94105',
	};
}
