# gtm-server-side-wordpress-plugin

WordPress plugin that adds GTM / server-side GTM tracking and a WooCommerce
dataLayer.

## Commands

- `npm run env:e2e:start`: WordPress + WooCommerce for the e2e suite on
  http://localhost:8889 (Docker).
- `npm run test:e2e`, `npm run typecheck:e2e`, `npm run lint:e2e`: the
  Playwright suite in `tests/e2e/`. Its rules load from `tests/e2e/CLAUDE.md`
  when you work there.
- `npm run typecheck`, `npm test`: the inline browser scripts in `assets/src/`.

## Release package

The plugin ships through `git archive`. A new development or test file outside
the folders `.gitattributes` already excludes needs an `export-ignore` line there.
