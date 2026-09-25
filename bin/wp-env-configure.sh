#!/usr/bin/env bash
#
# Runs inside the wp-env cli container (see bin/wp-env-setup.sh). Brings a
# freshly booted WordPress + WooCommerce to a state that's ready for manual
# poking or e2e tests: pretty permalinks, a usable store and this plugin's
# ecommerce data layer switched on. Every step is idempotent: wp-env runs it on
# each start, not just the first one.
#
# Seeds no products: e2e specs create and delete their own via the REST API
# (tests/e2e/api/products.ts).
#
# tests/e2e/setup/preflight.setup.ts checks what the specs depend on, so a
# setting added here that specs rely on belongs there too.
set -euo pipefail

echo "==> Pretty permalinks (WooCommerce cart/checkout endpoints need them)"
wp rewrite structure '/%postname%/' --hard

echo "==> Block theme the specs are written against"
wp theme activate twentytwentyfive

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
# it decides whether event names carry the `_stape` suffix and whether events
# ship a `cart_state` payload, which specs assert on.
wp option update gtm_server_side_data_layer_custom_event_name 'yes'

echo
echo "Ready: $( wp option get home )/shop/  (wp-admin: admin / password)"
