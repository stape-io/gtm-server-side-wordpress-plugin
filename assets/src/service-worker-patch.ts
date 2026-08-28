/**
 * Keeps service worker registrations on the same-origin proxy path.
 *
 * The container builds its service worker URL at runtime and registers it with
 * a ".js" extension, which web servers answer from their static file handler
 * before WordPress can proxy it. Registering as ".load" reaches the proxy,
 * which maps the extension back to ".js" upstream.
 */

/** The subset of `location` this module needs, so tests can pass a plain object. */
export interface PageLocation {
	href: string;
	origin: string;
}

/**
 * Rewrite a ".js" registration under the proxy path to ".load".
 *
 * Null when the script is not ours: another origin, a path outside the proxy,
 * another extension, or a value that will not parse.
 */
export function rewriteScriptUrl(
	script: string,
	location: PageLocation,
	basePath: string
): string | null {
	let url: URL;

	try {
		url = new URL( script, location.href );
	} catch ( error ) {
		return null;
	}

	if ( url.origin !== location.origin ) {
		return null;
	}

	if ( url.pathname.indexOf( basePath ) !== 0 ) {
		return null;
	}

	if ( ! /\.js$/i.test( url.pathname ) ) {
		return null;
	}

	url.pathname = url.pathname.replace( /\.js$/i, '.load' );

	return url.href;
}

/**
 * Wrap `navigator.serviceWorker.register` in the given window.
 *
 * Declined registrations reach the original implementation untouched, as does a
 * rewritten one the browser refuses - Trusted Types refusing a string, say.
 *
 * @return False when the window has no service worker support and nothing changed.
 */
export function installServiceWorkerPatch( win: Window, basePath: string ): boolean {
	const container = win.navigator && win.navigator.serviceWorker;

	if ( ! container || typeof container.register !== 'function' ) {
		return false;
	}

	const register = container.register;

	container.register = function (
		this: ServiceWorkerContainer,
		script: unknown,
		options?: RegistrationOptions
	): Promise< ServiceWorkerRegistration > {
		const rewritten = rewriteScriptUrl( String( script ), win.location, basePath );

		if ( null !== rewritten ) {
			try {
				return register.call( this, rewritten, options );
			} catch ( error ) {
				// Fall through to the original arguments.
			}
		}

		return register.call( this, script as string, options );
	} as ServiceWorkerContainer[ 'register' ];

	return true;
}
