#!/usr/bin/env bash
# Model-check AddToCart.tla with TLC. See .claude/skills/add-to-cart-once/SKILL.md.
#
# Usage: tests/formal/add-to-cart/run.sh [-v] [config ...]
#   With no config, runs every config and compares each with EXPECTED below.
#   -v prints TLC's full output, counterexample trace included.
# Exits non-zero when a config's result differs from EXPECTED.
#
# Needs Docker (the e2e store already does). Downloads a pinned
# tla2tools.jar into .cache/ on first run.
set -euo pipefail

TLA_VERSION=1.7.4
TLA_SHA256=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
JAVA_IMAGE=eclipse-temurin:21-jre

# config -> "pass", or the invariant a known finding violates.
# Change a line only together with the findings in SKILL.md.
EXPECTED=(
	"one:pass"
	"one-custom:pass"
	"two:AtMostOnce"
	"two-custom:AtMostOnce"
	"overlap:AtMostOnce"
	"lost:AtLeastOnce"
)

dir="$( cd "$( dirname "$0" )" && pwd )"
jar="$dir/.cache/tla2tools-$TLA_VERSION.jar"

verbose=0
if [ "${1:-}" = "-v" ]; then
	verbose=1
	shift
fi

if [ ! -f "$jar" ]; then
	mkdir -p "$dir/.cache"
	curl -sSLfo "$jar.part" "https://github.com/tlaplus/tlaplus/releases/download/v$TLA_VERSION/tla2tools.jar"
	echo "$TLA_SHA256  $jar.part" | shasum -a 256 -c - >/dev/null
	mv "$jar.part" "$jar"
fi

configs=( "$@" )
if [ ${#configs[@]} -eq 0 ]; then
	for entry in "${EXPECTED[@]}"; do
		configs+=( "${entry%%:*}" )
	done
fi

status=0
for config in "${configs[@]}"; do
	expected=""
	for entry in "${EXPECTED[@]}"; do
		[ "${entry%%:*}" = "$config" ] && expected="${entry#*:}"
	done

	out="$( docker run --rm -v "$dir:/spec" -w /spec "$JAVA_IMAGE" \
		java -XX:+UseParallelGC -cp "/spec/.cache/tla2tools-$TLA_VERSION.jar" tlc2.TLC \
		-config "$config.cfg" -workers auto -deadlock -metadir /tmp/tlc AddToCart.tla 2>&1 || true )"

	[ $verbose -eq 1 ] && echo "$out"

	if echo "$out" | grep -q "Model checking completed. No error has been found."; then
		got=pass
	elif violated="$( echo "$out" | grep -oE 'Invariant [A-Za-z]+ is violated' )"; then
		got="$( echo "$violated" | awk '{ print $2 }' )"
	else
		echo "$out"
		echo "$config: TLC did not finish (see above)"
		status=1
		continue
	fi

	states="$( echo "$out" | grep -oE '[0-9]+ distinct states found' || true )"
	if [ "$got" = "$expected" ]; then
		echo "ok       $config: $got ($states)"
	else
		echo "CHANGED  $config: expected ${expected:-?}, got $got ($states)"
		status=1
	fi
done
exit $status
