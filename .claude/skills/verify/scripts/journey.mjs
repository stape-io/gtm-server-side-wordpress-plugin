#!/usr/bin/env node
/**
 * Drives the e2e store (npm run env:e2e:start) in Chromium the way a shopper
 * does, and records every window.dataLayer push on every page it opens.
 *
 * Usage:
 *   node .claude/skills/verify/scripts/journey.mjs <name> [--headed] <step> ...
 *
 * Steps run in order:
 *   options=<json>          override store options for this browser only, by
 *                           WordPress option name, through the e2e helper
 *                           plugin (e.g. {"woocommerce_cart_redirect_after_add":"yes"})
 *   goto=<path or url>      open a page
 *   click=<target>          click; target is role:name segments joined by " > ",
 *                           each one scoping the next. name is a substring, or
 *                           /regex/i; role css takes a CSS selector, for a
 *                           WooCommerce hook with no accessible name.
 *                           e.g. click='listitem:E2E Mug > button:/add to cart/i'
 *                                click='css:form.cart > button:/add to cart/i'
 *   fill=<label>=<value>    fill the field with that accessible label
 *   select=<label>=<value>  choose an option in that select
 *   expect=<event>          wait (10 s) for that event; the plugin's suffix is
 *                           matched too, so add_to_cart matches add_to_cart_stape
 *   count=<event>=<n>       fail unless exactly n pushes of that event so far
 *   quiet=<ms>              wait, for a push that must not come
 *   eval=<js>               run JS in the page (a theme's own trigger, say)
 *   shot=<label>            screenshot
 *
 * Evidence goes to tests/e2e/artifacts/verify/<timestamp>-<name>/: steps.log,
 * pushes.json (every push with its page URL), a screenshot per step, final.png.
 * Exits 1 when a step fails, after writing the evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8889';
const OPTIONS_COOKIE = 'gtm_e2e_options';
const OPTIONS_HEADER = 'x-gtm-e2e-options';
const repoRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../..' );

const args = process.argv.slice( 2 );
const name = args.shift();
if ( ! name || name.includes( '=' ) ) {
	console.error( 'Usage: journey.mjs <name> [--headed] <step> ...  (see the header of this file)' );
	process.exit( 2 );
}
const headed = args.includes( '--headed' );
const steps = args.filter( ( a ) => a !== '--headed' );

const stamp = new Date().toISOString().replace( /[:.]/g, '-' );
const dir = path.join( repoRoot, 'tests/e2e/artifacts/verify', `${ stamp }-${ name }` );

const log = [];
function note( line ) {
	log.push( line );
	console.log( line );
}

const pushes = [];
let suffix = '';

const browser = await chromium.launch( { headless: ! headed } );
fs.mkdirSync( dir, { recursive: true } );
const context = await browser.newContext( { baseURL: BASE_URL } );
const page = await context.newPage();

// Record pushes before any page script runs, so the GTM snippet and the
// plugin's inline pushes are caught too. GTM's own push calls the one it
// replaces, so the hook stays in place after gtm.js loads.
await context.exposeBinding( '__verifyPush', ( source, entry ) => {
	pushes.push( { url: source.frame.url(), entry } );
} );
await context.addInitScript( () => {
	// The GTM snippet assigns window.dataLayer = window.dataLayer || [], the
	// same array again: wrap each array once, or every push counts twice.
	const hook = ( dl ) => {
		if ( ! Array.isArray( dl ) || dl.__verifyHooked ) {
			return;
		}
		Object.defineProperty( dl, '__verifyHooked', { value: true } );
		const push = dl.push;
		dl.push = function ( ...entries ) {
			for ( const e of entries ) {
				try {
					window.__verifyPush( JSON.parse( JSON.stringify( e ) ) );
				} catch ( err ) {
					window.__verifyPush( { unserializable: String( e ) } );
				}
			}
			return push.apply( this, entries );
		};
	};
	let dl = [];
	hook( dl );
	Object.defineProperty( window, 'dataLayer', {
		configurable: true,
		get: () => dl,
		set: ( value ) => {
			dl = value;
			hook( dl );
		},
	} );
} );

page.on( 'pageerror', ( e ) => note( `  page error: ${ e.message }` ) );
page.on( 'response', ( r ) => {
	const accepted = r.headers()[ OPTIONS_HEADER ];
	if ( accepted && r.request().isNavigationRequest() ) {
		note( `  options applied on ${ r.url() }: ${ accepted }` );
	}
} );

function eventName( entry ) {
	return entry && typeof entry.event === 'string' ? entry.event : null;
}

function matches( entry, event ) {
	const e = eventName( entry );
	return e === event || ( suffix && e === event + suffix );
}

async function readSuffix() {
	suffix = await page
		.evaluate( () => ( window.varGtmServerSide && window.varGtmServerSide.is_custom_event_name === 'yes'
			? window.varGtmServerSide.DATA_LAYER_CUSTOM_EVENT_NAME
			: '' ) )
		.catch( () => suffix );
}

function locate( target ) {
	let scope = page;
	for ( const segment of target.split( ' > ' ) ) {
		const i = segment.indexOf( ':' );
		const role = segment.slice( 0, i );
		const raw = segment.slice( i + 1 );
		const re = raw.match( /^\/(.*)\/([a-z]*)$/ );
		const label = re ? new RegExp( re[ 1 ], re[ 2 ] ) : raw;
		if ( 'css' === role ) {
			scope = scope.locator( raw );
			continue;
		}
		scope = [ 'listitem', 'row', 'article', 'form', 'region' ].includes( role )
			? scope.getByRole( role ).filter( { hasText: label } )
			: scope.getByRole( role, { name: label } );
	}
	return scope;
}

let failed = false;
let n = 0;
for ( const step of steps ) {
	n++;
	const eq = step.indexOf( '=' );
	const kind = step.slice( 0, eq );
	const value = step.slice( eq + 1 );
	note( `[${ n }] ${ step }` );
	try {
		switch ( kind ) {
			case 'options':
				JSON.parse( value );
				await context.addCookies( [ { name: OPTIONS_COOKIE, value: encodeURIComponent( value ), url: BASE_URL } ] );
				break;
			case 'goto': {
				const res = await page.goto( value );
				note( `  ${ res ? res.status() : '?' } ${ page.url() }` );
				break;
			}
			case 'click':
				await locate( value ).click();
				// A form submit or link starts a navigation: let it land.
				await page.waitForLoadState( 'load' );
				break;
			case 'fill': {
				const [ label, ...rest ] = value.split( '=' );
				await page.getByLabel( label ).fill( rest.join( '=' ) );
				break;
			}
			case 'select': {
				const [ label, ...rest ] = value.split( '=' );
				await page.getByLabel( label ).selectOption( rest.join( '=' ) );
				break;
			}
			case 'expect': {
				const deadline = Date.now() + 10_000;
				await readSuffix();
				while ( ! pushes.some( ( p ) => matches( p.entry, value ) ) ) {
					if ( Date.now() > deadline ) {
						throw new Error( `${ value } was never pushed` );
					}
					await page.waitForTimeout( 100 );
					await readSuffix();
				}
				break;
			}
			case 'count': {
				const [ event, want ] = value.split( '=' );
				await readSuffix();
				const got = pushes.filter( ( p ) => matches( p.entry, event ) ).length;
				note( `  ${ event }: ${ got } push(es)` );
				if ( got !== Number( want ) ) {
					throw new Error( `expected ${ want } push(es) of ${ event }, got ${ got }` );
				}
				break;
			}
			case 'quiet':
				await page.waitForTimeout( Number( value ) );
				break;
			case 'eval':
				note( `  -> ${ JSON.stringify( await page.evaluate( value ) ) }` );
				break;
			case 'shot':
				break;
			default:
				throw new Error( `unknown step ${ kind }` );
		}
		await page
			.screenshot( { path: path.join( dir, `${ String( n ).padStart( 2, '0' ) }-${ kind }.png` ) } )
			.catch( () => note( '  (no screenshot: the page was navigating)' ) );
	} catch ( e ) {
		note( `  FAILED: ${ e.message.split( '\n' )[ 0 ] }` );
		failed = true;
		break;
	}
}

await page.screenshot( { path: path.join( dir, 'final.png' ), fullPage: true } ).catch( () => {} );
await browser.close();

note( '' );
note( 'Events pushed, in order:' );
for ( const p of pushes ) {
	const e = eventName( p.entry );
	if ( e && ! e.startsWith( 'gtm.' ) ) {
		note( `  ${ e }  (${ p.url })` );
	}
}
note( failed ? 'RESULT: FAILED' : 'RESULT: ok' );
note( `Evidence: ${ path.relative( repoRoot, dir ) }` );

fs.writeFileSync( path.join( dir, 'pushes.json' ), JSON.stringify( pushes, null, '\t' ) );
fs.writeFileSync( path.join( dir, 'steps.log' ), log.join( '\n' ) + '\n' );
process.exit( failed ? 1 : 0 );
