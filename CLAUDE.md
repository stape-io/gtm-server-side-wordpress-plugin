# gtm-server-side-wordpress-plugin

WordPress plugin that adds GTM / server-side GTM tracking and a WooCommerce
dataLayer.

## Commands

- `npm run env:e2e:start`: WordPress + WooCommerce for the e2e suite on
  http://localhost:8889 (Docker).
- `npm run test:e2e`, `npm run typecheck:e2e`, `npm run lint:e2e`: the
  Playwright suite in `tests/e2e/` (`test:e2e` runs the parallel specs, then
  the serial ones; `test:e2e:parallel` / `test:e2e:serial` run one of them).
  Its rules load from `tests/e2e/CLAUDE.md` when you work there.
- `npm run typecheck`, `npm test`: the inline browser scripts in `assets/src/`.

## Release flow

Task branches (`DEV-1234-...`) and epic branches merge into `master`, which
publishes nothing. A release is a `vX.Y.Z` branch from `master` that bumps the
version and adds the changelog, merged into `master` with a merge commit. The
`X.Y.Z` tag (no `v`) then runs `.github/workflows/deploy.yml`, which publishes
to wordpress.org.

The plugin ships through `git archive`, so a new development or test file needs
an `export-ignore` line in `.gitattributes`.

## Rules and what enforces them

| Rule | Enforced by |
| --- | --- |
| The plugin header `Version:`, `Stable tag` in `README.txt` and `README.md`, and the newest changelog entry in both READMEs name the same version | `npm run check:release` in CI; `deploy.yml` runs it again against the tag before publishing |
| The release package holds only runtime files | `npm run check:release` (allowlist `RUNTIME` in `bin/check-release.mjs`) |
| Each e2e test title ends with its Testomat `@T` id | `playwright/valid-title` in `eslint.config.mjs` (`npm run lint:e2e`) |
| The committed service-worker bundle matches `assets/src` | "Built bundle matches assets/src" step in CI |
