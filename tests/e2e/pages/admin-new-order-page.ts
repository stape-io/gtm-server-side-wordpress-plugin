import { expect, type Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** wp-admin → WooCommerce → Orders → Add order, for a browser logged in as the admin (loginAsAdmin()). */
export class AdminNewOrderPage {
	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/wp-admin/admin.php?page=wc-orders&action=new' );
	}

	/** Adds `quantity` of `product` through "Add item(s)" → "Add product(s)", and waits for its line. */
	async addProduct( product: CreatedProduct, quantity: number ): Promise< void > {
		await this.page.getByRole( 'button', { name: 'Add item(s)' } ).click();
		await this.page.getByRole( 'button', { name: 'Add product(s)' } ).click();

		// WooCommerce's modals are a second `main` landmark, named by their heading.
		const modal = this.page
			.getByRole( 'main' )
			.filter( { has: this.page.getByRole( 'heading', { name: 'Add products' } ) } );
		await modal.getByRole( 'combobox', { name: 'Search for a product…' } ).click();
		// The product search is a select2 box. Opening it focuses its search
		// field, which opens outside the modal and has no name of its own (the
		// box it belongs to is a combobox too), so the name is typed there.
		await this.page.keyboard.type( product.name );
		await this.page.getByRole( 'listbox' ).getByRole( 'option', { name: product.name } ).click();
		// Picking a product adds an empty row for the next one.
		await modal.getByRole( 'row' ).filter( { hasText: product.name } ).getByRole( 'spinbutton' ).fill( String( quantity ) );
		await modal.getByRole( 'button', { name: 'Add', exact: true } ).click();

		await expect(
			this.page.getByRole( 'table' ).filter( { hasText: 'Item' } ).getByRole( 'link', { name: product.name } )
		).toBeVisible();
	}

	/** `status` as the Status select shows it: `Processing`. */
	async setStatus( status: string ): Promise< void > {
		// A select2 box: the select its label names is hidden from the
		// accessibility tree, and the box is named by the status it shows,
		// which is "Pending payment" on a new order.
		await this.page.getByRole( 'combobox', { name: 'Pending payment' } ).click();
		await this.page.getByRole( 'listbox' ).getByRole( 'option', { name: status, exact: true } ).click();
		await expect( this.page.getByRole( 'combobox', { name: status } ) ).toBeVisible();
	}

	/** Creates the order and returns its ID, once wp-admin shows the saved order. */
	async create(): Promise< number > {
		await this.page.getByRole( 'button', { name: 'Create', exact: true } ).click();
		await this.page.waitForURL( /[?&]action=edit/ );
		const id = Number( new URL( this.page.url() ).searchParams.get( 'id' ) );
		expect( id, 'The ID of the order wp-admin created' ).toBeGreaterThan( 0 );
		return id;
	}
}
