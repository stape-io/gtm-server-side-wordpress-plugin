import { installServiceWorkerPatch } from './service-worker-patch';

declare global {
	interface Window {
		/** Proxy base path, handed over by PHP in the same script element. */
		gtmServerSideSameOriginBase?: string;
	}
}

const basePath = window.gtmServerSideSameOriginBase;

if ( 'string' === typeof basePath && '' !== basePath ) {
	// The global is only a hand-off, so it does not outlive this line.
	delete window.gtmServerSideSameOriginBase;

	installServiceWorkerPatch( window, basePath );
}

export {};
