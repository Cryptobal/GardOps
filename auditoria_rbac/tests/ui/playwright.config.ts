import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
	testDir: '.',
	timeout: 120_000,
	expect: { timeout: 10_000 },
	retries: 0,
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
	},
	reporter: [['html', { outputFolder: '../../outputs/ui_report' }], ['list']],
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
});
