#!/usr/bin/env bash
#
# Runs after `wp-env start` (see .wp-env.json -> lifecycleScripts.afterStart).
# Brings a freshly booted WordPress + WooCommerce container to a state that's
# ready for manual poking or e2e tests: pretty permalinks, a usable store
# and this plugin's ecommerce data layer switched on.
#
# Deliberately seeds no products: e2e specs create and delete their own via
# the REST API (tests/e2e/api/products.ts) so they stay isolated and can run
# in parallel.
set -euo pipefail

wp() {
	npx wp-env run cli wp "$@"
}

echo "==> Pretty permalinks (WooCommerce cart/checkout endpoints need them)"
wp rewrite structure '/%postname%/' --hard

echo "==> Skipping the WooCommerce setup wizard"
wp option update woocommerce_onboarding_profile '{"skipped":true}' --format=json
wp option update woocommerce_allow_tracking 'no'
wp option update woocommerce_show_marketplace_suggestions 'no'

echo "==> Taking the store out of 'Coming soon' mode (blocks anonymous visitors otherwise)"
wp option update woocommerce_coming_soon 'no'

echo "==> Base store settings (US store, USD)"
wp option update woocommerce_default_country 'US:CA'
wp option update woocommerce_currency 'USD'
wp option update woocommerce_store_address '123 Test St'
wp option update woocommerce_store_city 'San Francisco'
wp option update woocommerce_store_postcode '94105'

echo "==> Enabling Cash on Delivery (lets e2e tests complete checkout without a real processor)"
wp option update woocommerce_cod_settings '{"enabled":"yes","title":"Cash on delivery","instructions":"Pay on delivery."}' --format=json

echo "==> Enabling this plugin's ecommerce data layer + a placeholder web GTM container"
wp option update gtm_server_side_data_layer_ecommerce 'yes'
wp option update gtm_server_side_placement 'code'
wp option update gtm_server_side_web_container_id 'GTM-TESTID'

# Set explicitly rather than relying on the plugin's activation-time default:
# it decides whether event names carry the `_stape` suffix and whether
# add_to_cart ships a `cart_state` payload, which specs assert on.
wp option update gtm_server_side_data_layer_custom_event_name 'yes'

echo
echo "Ready: http://localhost:8888  (wp-admin: admin / password)"
echo "Shop:  http://localhost:8888/shop/"
