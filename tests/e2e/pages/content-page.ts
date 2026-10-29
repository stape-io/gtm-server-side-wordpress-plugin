import type { Page } from '@playwright/test';
import type { CreatedPage } from '../api/pages';

/** A plain page a test created for itself (catalog.createPage()), such as a shop's own thank-you page. */
export class ContentPage {
	constructor( private readonly page: Page ) {}

	async goto( created: CreatedPage ): Promise< void > {
		await this.page.goto( created.link );
	}
}
