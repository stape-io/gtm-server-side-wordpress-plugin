import { expect, type Page, type Response } from '@playwright/test';

/** The My Account page: login and, with `myAccountRegistration` on, the Register form. */
export class MyAccountPage {
	/** The page register() landed on, as the server sent it. */
	private landing: Response | null = null;

	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/my-account/' );
	}

	/**
	 * Registers `email` through the Register form, which asks for nothing else
	 * while WooCommerce makes up the username and password. The form posts and
	 * redirects to My Account; waits until it shows the logged-in customer's
	 * account pages.
	 */
	async register( email: string ): Promise< void > {
		// The login form's field is "Username or email address", so the name
		// has to start with "Email address".
		await this.page.getByRole( 'textbox', { name: /^Email address/ } ).fill( email );
		// The page the browser renders next, whatever it is: the redirect's
		// target, or the form again with WooCommerce's error, which then fails
		// the check below with what it shows instead of a timeout here.
		const landing = this.page.waitForResponse(
			( response ) => response.request().isNavigationRequest() && response.status() === 200
		);
		await this.page.getByRole( 'button', { name: 'Register' } ).click();
		this.landing = await landing;
		await expect( this.page.getByRole( 'navigation', { name: 'Account pages' } ) ).toBeVisible();
	}

	/** The HTML of the page register() landed on, as View Source shows it: before any script ran. */
	async source(): Promise< string > {
		if ( ! this.landing ) {
			throw new Error( 'Call register() first: source() is the HTML of the page it lands on.' );
		}
		return this.landing.text();
	}

	/** The names of the cookies the browser holds for this site now, as DevTools lists them. */
	async cookieNames(): Promise< string[] > {
		return ( await this.page.context().cookies( this.page.url() ) ).map( ( cookie ) => cookie.name );
	}
}
