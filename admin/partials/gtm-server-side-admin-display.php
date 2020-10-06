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
?>

<style>
    #gtm-server-side-admin-settings form h2 {
        display: none;
    }

    #gtm-server-side-admin-group-gtm-url {
        width: 300px;
    }

    #gtm-server-side-admin-settings > form > table > tbody > tr:nth-child(3) {
        display: none;
    }

    #gtm-server-side-admin-settings > form > table > tbody > tr:nth-child(4) {
        display: none;
    }
</style>

<script>
    jQuery( document ).ready(function() {
        function showHideGTMIdField() {
            var elCode = jQuery('#<?=GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE?>');
            if (elCode.prop('checked')) {
                jQuery('#<?=GTM_SERVER_SIDE_WEB_CONTAINER_ID?>').prop('required', true).closest('tr').show();
            } else {
                jQuery('#<?=GTM_SERVER_SIDE_WEB_CONTAINER_ID?>').prop('required', false).closest('tr').hide();
            }

            var elOff = jQuery('#<?=GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF?>');
            if (elOff.prop('checked')) {
                jQuery('#<?=GTM_SERVER_SIDE_GA_ID?>').prop('required', true).closest('tr').show();
            } else {
                jQuery('#<?=GTM_SERVER_SIDE_GA_ID?>').prop('required', false).closest('tr').hide();
            }
        }
        showHideGTMIdField();

        jQuery(".<?=GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT?>").change(function () {
            showHideGTMIdField();
        });
    });
</script>

<div id="gtm-server-side-admin-settings" class="wrap">
    <h2><?php _e( 'Google Tag Manager Server-side for WordPress options', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></h2>
    <form action="options.php" method="post">
		<?php settings_fields( GTM_SERVER_SIDE_ADMIN_GROUP ); ?>
		<?php do_settings_sections( GTM_SERVER_SIDE_ADMIN_SLUG ); ?>
		<?php submit_button(); ?>

    </form>
</div>
