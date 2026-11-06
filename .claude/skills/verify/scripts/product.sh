#!/usr/bin/env bash
# Creates or deletes a test product in the e2e store, as the store admin over
# WP-CLI. The store has no products of its own.
#
# Usage:
#   .claude/skills/verify/scripts/product.sh create "<name>" <price>
#       prints: <id> <permalink>
#   .claude/skills/verify/scripts/product.sh delete <id> ...
#
# Name products "E2E verify <something unique>", so the e2e preflight and a
# person can tell them from real content.
set -euo pipefail

root="$( cd "$( dirname "$0" )/../../../.." && pwd )"
cd "$root"
wp() { npx wp-env --config=.wp-env.e2e.json run cli wp "$@" 2>/dev/null | tail -1; }

case "${1:-}" in
	create)
		name="$2"
		price="$3"
		id="$( wp wc product create --user=admin --name="$name" --regular_price="$price" --porcelain )"
		echo "$id $( wp eval "echo get_permalink( $id );" )"
		;;
	delete)
		shift
		for id in "$@"; do
			wp wc product delete "$id" --user=admin --force=true --porcelain >/dev/null
			echo "deleted $id"
		done
		;;
	*)
		sed -n '2,12p' "$0"
		exit 2
		;;
esac
