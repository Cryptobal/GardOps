import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		baseURL: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
		headless: true,
		screenshot: 'only-on-failure',
		video: 'off',
	},
	reporter: [
		['html', { outputFolder: 'outputs/ui_report', open: 'never' }],
		['json', { outputFile: 'outputs/ui_results.json' }],
		['list']
	],
});
