import { expect, type Page } from '@playwright/test';
import type { CreatedUser } from '../api/customers';

/** WordPress's own login screen, wp-login.php: login and, with `usersCanRegister` on, registration. */
export class WpLoginPage {
	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/wp-login.php' );
	}

	async gotoRegister(): Promise< void > {
		await this.page.goto( '/wp-login.php?action=register' );
	}

	/**
	 * Logs `user` in, which redirects to wp-admin, as it does for staff;
	 * waits until it is there.
	 */
	async logIn( user: CreatedUser ): Promise< void > {
		await this.page.getByLabel( 'Username or Email Address' ).fill( user.username );
		await this.page.getByLabel( 'Password', { exact: true } ).fill( user.password );
		await this.page.getByRole( 'button', { name: 'Log In' } ).click();
		await this.page.waitForURL( /\/wp-admin\// );
	}

	/**
	 * Registers `email`, with its local part as the username, which is
	 * unique like the email. WordPress emails the password and lands on the
	 * "Registration complete" notice; waits until it shows.
	 */
	async register( email: string ): Promise< void > {
		await this.page.getByLabel( 'Username' ).fill( email.split( '@' )[ 0 ] );
		await this.page.getByLabel( 'Email' ).fill( email );
		await this.page.getByRole( 'button', { name: 'Register' } ).click();
		await expect( this.page.getByText( 'Registration complete.' ) ).toBeVisible();
	}
}
