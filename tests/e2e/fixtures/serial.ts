/**
 * The details of a serial test: one that writes what every page reads (a
 * setting saved in wp-admin, cron), so it must run with no other test running
 * (see Store settings in README.md).
 *
 * The lock is Playwright's built-in exclusive one: the test starts only once
 * every running test has ended, and no test starts until it ends. The tag is
 * what the fixtures that act differently for a serial test read
 * (siteState, adminSettingsPage), since a test's locks aren't in TestInfo.
 * Both come in one constant, and lint forbids writing '@serial' in a spec, so
 * a test can't carry the tag without the lock.
 */
export const SERIAL = { tag: '@serial', lock: '-exclusive-' } as const;
