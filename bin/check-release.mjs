#!/usr/bin/env node
//
// Checks the two things a release has gotten wrong before:
//
// 1. The version. WordPress reads it from the plugin header and from
//    README.txt's "Stable tag"; README.md repeats it for GitHub. Releases have
//    shipped with these out of sync, and with no changelog entry.
// 2. The package. The plugin ships through `git archive` (see .gitattributes).
//    2.3.9 shipped tests/, bin/ and the wp-env and Playwright configs.
//
// Usage: bin/check-release.mjs [tag]
// With a tag (deploy.yml passes the pushed one), the version must equal it.
// Reads the committed tree (HEAD), not uncommitted changes.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Paths the plugin loads at runtime. Anything else in the package is a
// development file that needs an `export-ignore` line in .gitattributes.
const RUNTIME = [
	'gtm-server-side.php',
	'bootstrap.php',
	'README.txt',
	'LICENSE.txt',
	'assets/',
	'includes/',
	'languages/',
	'templates/',
];

const errors = [];

function versionIn( file, pattern ) {
	if ( ! existsSync( file ) ) {
		return null;
	}
	const match = readFileSync( file, 'utf8' ).match( pattern );
	return match ? match[ 1 ] : null;
}

const version = versionIn( 'gtm-server-side.php', /^\s*\*\s*Version:\s*(\S+)/m );
const stableTxt = versionIn( 'README.txt', /^Stable tag:\s*(\S+)/m );
const stableMd = versionIn( 'README.md', /^\*\*Stable tag:\*\*\s*(\S+)/m );
const firstChangelogTxt = versionIn( 'README.txt', /^== Changelog ==\s*\n\s*= (\S+) =/m );
const firstChangelogMd = versionIn( 'README.md', /^## (\d+\.\d+\.\d+)\s*$/m );

if ( ! version ) {
	errors.push( 'gtm-server-side.php: no "Version:" in the plugin header.' );
}
for ( const [ file, found, what ] of [
	[ 'README.txt', stableTxt, 'Stable tag' ],
	[ 'README.md', stableMd, '**Stable tag:**' ],
	[ 'README.txt', firstChangelogTxt, 'first "= x.y.z =" entry under "== Changelog =="' ],
	[ 'README.md', firstChangelogMd, 'first "## x.y.z" changelog entry' ],
] ) {
	if ( found !== version ) {
		errors.push( `${ file }: ${ what } is ${ found ?? 'missing' }, the plugin header says ${ version }.` );
	}
}

const tag = process.argv[ 2 ];
if ( tag && tag !== version ) {
	errors.push( `Tag ${ tag } doesn't match the plugin header version ${ version }. Bump it in a vX.Y.Z branch first.` );
}

const packaged = execFileSync( 'sh', [ '-c', 'git archive HEAD | tar -t' ], { encoding: 'utf8' } )
	.split( '\n' )
	.filter( ( path ) => path && ! path.endsWith( '/' ) );
const stray = packaged.filter( ( path ) => ! RUNTIME.some( ( allowed ) => path === allowed || ( allowed.endsWith( '/' ) && path.startsWith( allowed ) ) ) );
for ( const path of stray ) {
	errors.push( `${ path } ships in the plugin package. Add an export-ignore line for it to .gitattributes, or add it to RUNTIME in bin/check-release.mjs if the plugin loads it.` );
}

if ( errors.length ) {
	console.error( errors.join( '\n' ) );
	process.exit( 1 );
}
console.log( `Release ${ version }: versions agree, ${ packaged.length } packaged files are all runtime files.` );
