import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { uniqueSuffix } from './products';

/**
 * Tax rates a test creates for itself, over the REST API. Rates are
 * store-wide, so each one goes into a tax class of its own, which only the
 * test's own products use: no other product, and no other test running at the
 * same time, ever matches it. A rate only counts in a browser that turns
 * taxes on (`storeOptions( { calcTaxes: 'yes' } )`).
 */

/** Every class name created here starts with this, which is what purgeTestTaxRates() looks for. */
const NAME_PREFIX = 'E2E ';

export type CreatedTaxRate = {
	id: number;
	/** The rate's name, which the cart shows as the label of its tax line. */
	name: string;
	/** The slug of the class holding only this rate, for ProductOptions' `tax_class`. */
	taxClass: string;
};

export type TaxRateOptions = {
	/** Two-letter country code. */
	country: string;
	/** Percent, as WooCommerce stores it: `'25'`. */
	rate: string;
};

/** A tax rate in a tax class of its own. */
export async function createTaxRate(
	requestUtils: RequestUtils,
	{ country, rate }: TaxRateOptions
): Promise< CreatedTaxRate > {
	const unique = uniqueSuffix();
	const taxClass: { slug: string } = await requestUtils.rest( {
		path: '/wc/v3/taxes/classes',
		method: 'POST',
		data: { name: `${ NAME_PREFIX }Tax ${ unique }` },
	} );
	try {
		const created = await requestUtils.rest( {
			path: '/wc/v3/taxes',
			method: 'POST',
			data: { country, rate, name: `${ NAME_PREFIX }Rate ${ unique }`, class: taxClass.slug },
		} );
		return { id: created.id, name: created.name, taxClass: taxClass.slug };
	} catch ( error ) {
		// The caller never gets the rate, so nothing else would delete the class.
		await deleteTaxClass( requestUtils, taxClass.slug );
		throw error;
	}
}

/** Deletes the rate and the class that holds it. */
export async function deleteTaxRate( requestUtils: RequestUtils, rate: CreatedTaxRate ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/taxes/${ rate.id }`, method: 'DELETE', params: { force: 'true' } } );
	await deleteTaxClass( requestUtils, rate.taxClass );
}

/** Deleting a class also deletes the rates still in it. */
async function deleteTaxClass( requestUtils: RequestUtils, slug: string ): Promise< void > {
	await requestUtils.rest( { path: `/wc/v3/taxes/classes/${ slug }`, method: 'DELETE', params: { force: 'true' } } );
}

/** Deletes every tax class, with its rates, a previous run left behind (see purgeTestCatalog()). */
export async function purgeTestTaxRates( requestUtils: RequestUtils ): Promise< void > {
	const classes: Array< { slug: string; name: string } > = await requestUtils.rest( { path: '/wc/v3/taxes/classes' } );
	await Promise.all(
		classes
			.filter( ( taxClass ) => taxClass.name.startsWith( NAME_PREFIX ) )
			.map( ( taxClass ) => deleteTaxClass( requestUtils, taxClass.slug ) )
	);
}
