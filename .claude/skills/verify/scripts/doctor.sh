#!/usr/bin/env bash
# Read-only: is the e2e store on :8889 worth driving, and is it running THIS
# checkout's plugin? Prints one line per check; exits 1 on the first failure.
#
# Usage: .claude/skills/verify/scripts/doctor.sh
set -uo pipefail

root="$( cd "$( dirname "$0" )/../../../.." && pwd )"
base="${WP_BASE_URL:-http://localhost:8889}"
plugin="$( basename "$root" )"

fail() { echo "FAIL  $*"; exit 1; }
ok() { echo "ok    $*"; }

docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker Desktop."

container="$( docker ps --filter publish=8889 --format '{{.Names}}' | head -1 )"
[ -n "$container" ] || fail "nothing listens on :8889. Run: npm run env:e2e:start"

source="$( docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/www/html/wp-content/plugins/'"$plugin"'"}}{{.Source}}{{end}}{{end}}' "$container" )"
[ "$source" = "$root" ] || fail ":8889 ($container) serves another checkout's plugin (${source:-no wp-content/plugins/$plugin mount}). Stop that store (npm run env:e2e:stop in its checkout) and start this one."
ok ":8889 is $container, plugin mounted from this checkout"

code="$( curl -s -o /dev/null -w '%{http_code}' "$base/shop/" )"
[ "$code" = 200 ] || fail "$base/shop/ answered $code. If the store just started, wait for 'Ready:' in its output."
ok "$base/shop/ answers 200"

cd "$root"
info="$( npx wp-env --config=.wp-env.e2e.json run cli wp eval '
	echo ( is_plugin_active( "'"$plugin"'/gtm-server-side.php" ) ? "active" : "inactive" ), " ",
		get_option( "gtm_server_side_data_layer_ecommerce" ), " ",
		get_option( "gtm_server_side_data_layer_custom_event_name" ), " ",
		( function_exists( "gtm_server_side_e2e_cookie_options" ) ? "helper" : "nohelper" );
' 2>/dev/null | tail -1 )"
read -r active ecommerce custom helper <<<"$info"
[ "$active" = active ] || fail "plugin $plugin is not active ($info)"
[ "$ecommerce" = yes ] || fail "ecommerce data layer is off; bin/wp-env-configure.sh did not run. Run: npm run env:e2e:start"
[ "$helper" = helper ] || fail "the e2e helper mu-plugin is not loaded. Run: npm run env:e2e:stop && npm run env:e2e:start"
ok "plugin active, ecommerce data layer on, custom event name: $custom, e2e helper loaded"

version="$( sed -n 's/^ \* Version: *//p' gtm-server-side.php | head -1 )"
ok "plugin version in this checkout: $version, commit $( git rev-parse --short HEAD )$( git diff --quiet || echo ' + uncommitted changes' )"
