#!/usr/bin/env bash
#
# Runs after `wp-env start` (see lifecycleScripts.afterStart in .wp-env.json
# and .wp-env.e2e.json). Hands bin/wp-env-configure.sh to the cli container
# in a single `wp-env run`, since every run is a separate Docker exec.
#
# Usage: bin/wp-env-setup.sh [wp-env config file]
set -euo pipefail

config_args=()
if [[ $# -gt 0 ]]; then
	config_args=( "--config=$1" )
fi

# wp-env mounts the project as wp-content/plugins/<directory name>.
plugin_dir="wp-content/plugins/$( basename "$PWD" )"

# The ${a[@]+...} form: macOS still ships bash 3.2, where an empty array
# trips `set -u`.
npx wp-env ${config_args[@]+"${config_args[@]}"} run cli --env-cwd="$plugin_dir" bash bin/wp-env-configure.sh
