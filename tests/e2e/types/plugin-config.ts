/**
 * The `varGtmServerSide` object the plugin localizes into every storefront
 * page - see wp_enqueue_scripts() in
 * includes/class-gtm-server-side-frontend-assets.php.
 *
 * Settings the plugin was rendered with, not anything it pushed, which is why
 * this does not live alongside the dataLayer contract in ./data-layer.ts.
 */
export type PluginConfig = {
	ajax: string;
	security: string;
	currency: string;
	/** 'yes' when event names carry the DATA_LAYER_CUSTOM_EVENT_NAME suffix. */
	is_custom_event_name: string;
	DATA_LAYER_CUSTOM_EVENT_NAME: string;
	user_data?: Record< string, unknown >;
};
