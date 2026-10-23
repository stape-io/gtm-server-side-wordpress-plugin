import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { uniqueSuffix } from './products';

/**
 * Coupons a test creates for itself, over the REST API. A coupon is
 * store-wide, but only the browser that applies it gets the discount, and its
 * code is unique, so no other test applies it.
 */

/** Every code created here starts with this, which is what purgeTestCoupons() looks for. WooCommerce lowercases codes. */
const CODE_PREFIX = 'e2e-';

export type CreatedCoupon = {
	id: number;
	code: string;
};

/** A coupon taking `percent` % off the cart. */
export async function createCoupon( requestUtils: RequestUtils, percent: string ): Promise< CreatedCoupon > {
	const created = await requestUtils.rest( {
		path: '/wc/v3/coupons',
		method: 'POST',
		data: {
			code: `${ CODE_PREFIX }coupon-${ uniqueSuffix() }`,
			discount_type: 'percent',
			amount: percent,
		},
	} );
	return { id: created.id, code: created.code };
}

export async function deleteCoupon( requestUtils: RequestUtils, id: number ): Promise< void > {
	await requestUtils.rest( {
		path: `/wc/v3/coupons/${ id }`,
		method: 'DELETE',
		params: { force: 'true' },
	} );
}

/** Deletes every coupon a previous run left behind (see purgeTestCatalog()). */
export async function purgeTestCoupons( requestUtils: RequestUtils ): Promise< void > {
	const leftovers = async (): Promise< number[] > => {
		const found: Array< { id: number; code: string } > = await requestUtils.rest( {
			path: '/wc/v3/coupons',
			params: { search: CODE_PREFIX, per_page: 100 },
		} );
		return found.filter( ( coupon ) => coupon.code.startsWith( CODE_PREFIX ) ).map( ( coupon ) => coupon.id );
	};

	for ( let ids = await leftovers(); ids.length; ids = await leftovers() ) {
		await Promise.all( ids.map( ( id ) => deleteCoupon( requestUtils, id ) ) );
	}
}
