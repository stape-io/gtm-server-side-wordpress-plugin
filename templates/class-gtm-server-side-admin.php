<?php
/**
 * Provide a admin area view for the plugin
 *
 * This file is used to markup the admin-facing aspects of the plugin.
 *
 * @link       http://example.com
 * @since      1.0.0
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/admin/partials
 */

$tab = GTM_Server_Side_Admin_Settings::get_settings_tab(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
?>

<div id="gtm-server-side-admin-settings" class="wrap">
	<h2><?php esc_html_e( 'Google Tag Manager server side for WordPress options', 'gtm-server-side' ); ?></h2>

	<div class="tabinfo">
		<strong>
			<?php esc_html_e( 'This plugin is intended to be used by IT girls&guys and marketing staff. If you don\'t know what to do follow our ', 'gtm-server-side' ); ?>
			<a href="https://stape.io/blog/how-to-add-google-tag-manager-server-side-container-to-wordpress" target="_blank">
				<?php esc_html_e( 'step by step tutorial', 'gtm-server-side' ); ?>
			</a>.
		</strong>
	</div>

	<div class="nav-tab-wrapper wp-clearfix">
		<a href="<?php echo remove_query_arg( 'tab' ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" class="nav-tab<?php echo 'general' === $tab ? ' nav-tab-active' : ''; ?>">
			<?php esc_html_e( 'General', 'gtm-server-side' ); ?>
		</a>
		<?php if ( GTM_Server_Side_Helpers::is_plugin_wc_enabled() ) : ?>
			<a href="<?php echo add_query_arg( array( 'tab' => 'data-layer' ) ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" class="nav-tab<?php echo 'data-layer' === $tab ? ' nav-tab-active' : ''; ?>">
				<?php esc_html_e( 'Data Layer', 'gtm-server-side' ); ?>
			</a>
		<?php else : ?>
			<div class="nav-tab tab-disabled" title="<?php esc_html_e( 'Activate WooCommerce plugin', 'gtm-server-side' ); ?>">
				<?php esc_html_e( 'Data Layer', 'gtm-server-side' ); ?>
			</div>
		<?php endif; ?>
		<?php if ( GTM_Server_Side_Helpers::is_plugin_wc_enabled() ) : ?>
			<a href="<?php echo add_query_arg( array( 'tab' => 'webhooks' ) ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" class="nav-tab<?php echo 'webhooks' === $tab ? ' nav-tab-active' : ''; ?>">
				<?php esc_html_e( 'Webhooks', 'gtm-server-side' ); ?>
			</a>
		<?php else : ?>
			<div class="nav-tab tab-disabled" title="<?php esc_html_e( 'Activate WooCommerce plugin', 'gtm-server-side' ); ?>">
				<?php esc_html_e( 'Webhooks', 'gtm-server-side' ); ?>
			</div>
		<?php endif; ?>
	</div>

	<form action="options.php" method="post" class="js-form-gtm-server-side">
		<input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>" ?>
		<?php settings_fields( GTM_SERVER_SIDE_ADMIN_GROUP ); ?>
		<?php do_settings_sections( GTM_SERVER_SIDE_ADMIN_SLUG ); ?>

		<?php if ( 'webhooks' === $tab ) : ?>
			<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th style="font-weight: normal;">
							<button type="button" class="button | js-send-test-webhooks">
								<?php esc_html_e( 'Send test webhook', 'gtm-server-side' ); ?>
							</button>
							<p>
								<?php esc_html_e( 'If you have made changes to the settings, first save them before sending the test.', 'gtm-server-side' ); ?>
							</p>
						</th>
						<td class="js-ajax-message" data-message-loading="<?php esc_html_e( 'Sending...', 'gtm-server-side' ); ?>"></td>
					</tr>
				</tbody>
			</table>
		<?php endif; ?>

		<?php submit_button(); ?>
	</form>
</div>
