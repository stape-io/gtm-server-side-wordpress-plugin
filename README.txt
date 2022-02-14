=== Plugin Name ===
Contributors: gtmserver,bukashk0zzz
Tags: google tag manager, google tag manager server side, gtm, gtm server side, tag manager, tagmanager, analytics, google, serverside, server-side, gtag
Requires at least: 5.2.0
Tested up to: 5.9.0
Stable tag: 1.1.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Google Tag Manager Server Side Integration Made Easy

== Description ==

Google Tag Manager Server Side Integration Made Easy.

This plugin lets you:

* Add Google Tag Manager Web container to your website.
* Download gtm and google analytics javascript libraries from your domain and prevent 3rd party cookie blocking.
* If you have an existing setup of GTM using another plugin it can update the settings of known plugins to use your GTM Server Side container for tracking.
* Can send events to GTM server side without any js library and optimize page speed.

Google Tag Manager Server Side makes your analytics data resistant to:

* 3rd party cookies blockers (adBlockers can't block it)
* intelligent tracking protection (Safari, Firefox, etc will track all users)
* security policy restrictions (all js libraries will load from your domain)

== Installation ==

1. Unzip and upload the "gtm-server-side" to the '/wp-content/plugins/' directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings / GTM Server Side and enter your GTM Server Side url and set additional options

== Frequently Asked Questions ==

= What is Google Tag Manager =

Please refer to the official <a href="https://marketingplatform.google.com/about/tag-manager/">Google Tag Manager Documentation</a>.

= What is Google Tag Manager Server Side =

Please refer to the technical description of <a href="https://stape.io/blog/what-is-google-tag-manager-server-side-tracking">Google Tag Manager Server Side </a>.

= Where I can get GTM Server Side url =

Please refer to blog post <a href="https://stape.io/blog/how-to-set-up-google-tag-manager-server-side-container">how to set up Google Tag Manager Server Side Container </a>.

= Does the plugin support WooCommerce =

Yes, please refer to the blog post on how to setup <a href="https://stape.io/blog/how-to-add-google-analytics-and-facebook-pixels-to-wordpress-using-google-tag-manager-server-container">server side Tagging For WordPress with WooCommerce </a>.

= Can I integrate Facebook Conversion API with Google Tag Manager server side =

Yes. <a href="https://stape.io/blog/how-to-set-up-facebook-conversion-api">How to Setup Facebook Conversion API </a>.

== Screenshots ==

1. Plugin settings.
2. Menu item in the settings panel.

== Changelog ==

= 1.1.0 =
* Added support of Stape custom loader.

= 1.0.5 =
* Update regarding Gtm Server to Stape rename.

= 1.0.4 =
* Fixed issues regarding GTM SS debugger

= 1.0.3 =
* Added support for WordPress 5.7
* Added more links to how to setup instructions

= 1.0.2 =
* Added ecommerce events

= 1.0.1 =
* Assets and texts update.

= 1.0.0 =
* Init release.
