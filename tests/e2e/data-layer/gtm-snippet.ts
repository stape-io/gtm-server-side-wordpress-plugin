/**
 * What the GTM snippet specs look for in a page's source: the folder's
 * settings and the markers of each snippet variant the plugin prints.
 */

/** The sGTM URL the folder's cases store; stubGtm answers it, since it doesn't resolve. */
export const SGTM_URL = 'https://sgtm.example.test';

/** Where the plugin's GTM block starts. */
export const GTM_START = '<!-- Google Tag Manager -->';

/** `id=GTM-TESTID`, base64-encoded and URL-encoded, as the cases give it. */
export const ENCODED_TESTID = 'aWQ9R1RNLVRFU1RJRA%3D%3D';

/** The identifier snippet's loader URL for `abcdefgh`, `<PREFIX>` captured. */
export const ABCDEFGH_LOADER = /j\.src="https:\/\/sgtm\.example\.test\/([A-Za-z0-9]{1,5})abcdefgh\.js\?"/;

/** The Fake API loader of the folder's fixtures, stored as a loader fetched from the Stape API. */
export const API_LOADER = '<script>/*API-LOADER*/window.dataLayer=window.dataLayer||[];window.snipApiLoader=1;</script>';

/** The consent script's own marker. */
export const CONSENT_SCRIPT = 'gtmVariable:"dataLayer"';
