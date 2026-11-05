/**
 * The names of playwright.config.ts's two test projects, read by fixtures
 * that act differently in the serial one (siteState, adminSettingsPage), so a
 * typo can't quietly turn their checks off. Both run in Chromium; the name
 * says how the project runs (see Store settings in README.md).
 */
export const PARALLEL_PROJECT = 'parallel';
export const SERIAL_PROJECT = 'serial';
