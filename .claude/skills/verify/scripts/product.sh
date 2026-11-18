#!/usr/bin/env bash
# Creates or deletes a test product in the e2e store, as the store admin over
# WP-CLI. The store has no products of its own.
#
# Usage:
#   .claude/skills/verify/scripts/product.sh create "<name>" <price>
#       prints: <id> <permalink>
#   .claude/skills/verify/scripts/product.sh create-variable "<name>"
#       Color Red / Blue and Size S / M; variation Red (any size) at 30.00 and
#       Blue M at 32.00, as tests/e2e/api/products.ts VARIATIONS.
#       prints: <id> <permalink> <red variation id> <blue-m variation id>
#   .claude/skills/verify/scripts/product.sh delete <id> ...
#       deletes a variable product's variations with it; exits 1 if one is left
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
	create-variable)
		name="$( printf '%s' "$2" | base64 )"
		wp eval '
			$attributes = array();
			foreach ( array( "Color" => array( "Red", "Blue" ), "Size" => array( "S", "M" ) ) as $label => $options ) {
				$attribute = new WC_Product_Attribute();
				$attribute->set_name( $label );
				$attribute->set_options( $options );
				$attribute->set_visible( true );
				$attribute->set_variation( true );
				$attributes[] = $attribute;
			}
			$product = new WC_Product_Variable();
			$product->set_name( base64_decode( "'"$name"'" ) );
			$product->set_status( "publish" );
			$product->set_attributes( $attributes );
			$id = $product->save();
			$variations = array();
			foreach ( array( array( array( "color" => "Red" ), "30.00" ), array( array( "color" => "Blue", "size" => "M" ), "32.00" ) ) as list( $chosen, $price ) ) {
				$variation = new WC_Product_Variation();
				$variation->set_parent_id( $id );
				$variation->set_attributes( $chosen );
				$variation->set_regular_price( $price );
				$variations[] = $variation->save();
			}
			WC_Product_Variable::sync( $id );
			echo $id, " ", get_permalink( $id ), " ", implode( " ", $variations );
		'
		;;
	delete)
		shift
		status=0
		for id in "$@"; do
			case "$id" in *[!0-9]*|"") echo "error: $id is not a product id" >&2; status=1; continue ;; esac
			result="$( wp eval '
				$product = wc_get_product( '"$id"' );
				if ( ! $product ) { echo "missing"; return; }
				$variations = get_posts( array( "post_type" => "product_variation", "post_parent" => '"$id"', "post_status" => "any", "fields" => "ids", "numberposts" => -1 ) );
				foreach ( $variations as $variation ) {
					wc_get_product( $variation )->delete( true );
				}
				$product->delete( true );
				clean_post_cache( '"$id"' );
				echo get_post( '"$id"' ) ? "left" : "gone";
			' )"
			case "$result" in
				gone) echo "deleted $id" ;;
				missing) echo "error: no product $id" >&2; status=1 ;;
				*) echo "error: product $id still exists ($result)" >&2; status=1 ;;
			esac
		done
		exit "$status"
		;;
	*)
		sed -n '2,17p' "$0"
		exit 2
		;;
esac
