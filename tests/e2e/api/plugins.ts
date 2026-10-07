import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/** What to tell someone whose environment is not the one the specs expect. */
export const RECREATE_ENVIRONMENT =
	'Recreate the environment: npm run env:e2e:destroy && npm run env:e2e:start';

/** One entry of GET /wp/v2/plugins. `plugin` is `<folder>/<main file>`. */
export type InstalledPlugin = { plugin: string; status: string; version: string; textdomain: string };

/** What WordPress reports as installed, active or not. */
export async function getInstalledPlugins( requestUtils: RequestUtils ): Promise< InstalledPlugin[] > {
	return requestUtils.rest( { path: '/wp/v2/plugins' } );
}

/** The plugin under test, matched by its text domain. */
export function findThisPlugin( plugins: InstalledPlugin[] ): InstalledPlugin | undefined {
	return plugins.find( ( p ) => p.textdomain === 'gtm-server-side' );
}
