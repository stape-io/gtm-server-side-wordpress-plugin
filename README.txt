=== Plugin Name ===
Contributors: gtmserver,bukashk0zzz
Tags: google tag manager, google tag manager server side, gtm, gtm server side, tag manager, tagmanager, analytics, google, serverside, server-side, gtag
Requires at least: 5.2.0
Tested up to: 6.6.0
Stable tag: 2.1.20
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Google Tag Manager Server Side Integration Made Easy

== Description ==

If you are looking for the easiest way to implement server-side tracking on your WordPress website, the GTM Server Side plugin by stape.io is the best solution. It helps to easily modify the gtm script with the tagging server URL, adds a custom loader, and sends data layer events and webhooks.


GTM Server Side plugin by stape.io features:

* Add web Google Tag Manager script on every website page.
* Work with any other WP plugin that inserts gtm script on the website.
* Adds custom loader, which makes Google Tag Manager and Google Analytics tracking invisible to ad blockers and other tracking prevention mechanisms.
* Sends events to GTM server side without any js library and optimizes page speed.
* Adds e-commerce Data Layer events.
* Adds user data to Data Layer events.
* Sends webhooks.

Benefits of GTM Server Side plugin by stape.io:

* Increase cookies lifetime when using a custom domain for server Google Tag Manager container.
* Increases the accuracy of tracking when the custom loader is enabled.
* Simplifies the process of adding GTM script on the website and delivering e-commerce and user data.

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

1. General plugin settings.
2. Data Layer settings.
2. Webhooks settings.
4. Menu item in the settings panel.

== Changelog ==

= 2.1.20 =
* Change JS code
* Added option "Stape Analytics support"

= 2.1.19 =
* Added "view_item_list" event
* "ecomm_pagetype" key added to dataLayer
* Added Order paid webhook

= 2.1.18 =
* Added sending _ga_* cookies to webhook for a new order

= 2.1.17 =
* Tested up to WordPress 6.6

= 2.1.16 =
* Hidden option "Update existing web GTM script"

= 2.1.15 =
* Removing empty field fields user_data before sending event

= 2.1.14 =
* Added sending - Decorate dataLayer event name

= 2.1.13 =
* Custom loader update

= 2.1.12 =
* Add more cookies to the list of cookies that are sent to the server

= 2.1.11 =
* Tested up to WordPress 6.4.2

= 2.1.10 =
* Changed validation for field - Server GTM container URL

= 2.1.9 =
* Tested up to WordPress 6.4

= 2.1.8 =
* Changed settings text

= 2.1.7 =
* Tested up to WordPress 6.3

= 2.1.6 =
* Fix session bug
* Added sending cookies
* Add events: view_cart, remove_from_cart

= 2.1.5 =
* Fix bug with versions numbers

= 2.1.4 =
* Fix bug on webhooks tab

= 2.1.3 =
* Settings field "GTM server container URL" is not required

= 2.1.2 =
* Added support for WordPress 6.2

= 2.1.1 =
* Fix user data on purchase event

= 2.1.0 =
* Added setting "Cookie Keeper"

= 2.0.2 =
* Updated description and screenshots

= 2.0.1 =
* Updated description and screenshots

= 2.0.0 =
* Changed plugin settings page. Added two new tabs - Data Layer and Webhooks.
* Added integration with WooCommerce plugin.
* Data Layer tab. Added the ability to track e-commerce events for the Data Layer - Login, SignUp, ViewItem, AddToCart, BeginCheckout. Including user data.
* Webhooks tab. Added the ability to send Purchase or Refund data to a third-party URL.

= 1.1.4 =
* Added support for WordPress 6.1

= 1.1.3 =
* Added support for WordPress 6.0

= 1.1.2 =
* Improve security

= 1.1.1 =
* Added support for WordPress 5.9

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
