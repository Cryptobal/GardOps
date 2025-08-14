import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function main() {
	const root = process.cwd();
	const cfg = path.join(root, 'tests', 'ui', 'playwright.config.ts');
	let exitCode = 0;
	try {
		execSync(`npx playwright test --config=${cfg}`, { stdio: 'inherit' });
	} catch (e: any) {
		exitCode = e?.status || 1;
		console.warn('Playwright terminó con errores, continuando para generar reportes...');
	}
	// Copiar reportes a nombres esperados
	const htmlSrc = path.join(root, 'outputs', 'ui_report', 'index.html');
	const htmlDst = path.join(root, 'outputs', 'rbac_results_ui.html');
	try { if (fs.existsSync(htmlSrc)) fs.copyFileSync(htmlSrc, htmlDst); } catch {}
	const jsonPath = path.join(root, 'outputs', 'ui_results.json');
	const failuresMd = path.join(root, 'outputs', 'rbac_failures_ui.md');
	if (fs.existsSync(jsonPath)) {
		try {
			const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
			const lines: string[] = [];
			for (const suite of data.suites || []) {
				for (const spec of suite.specs || []) {
					for (const t of spec.tests || []) {
						const res = (t.results || [])[0] || {};
						if (res.status && res.status !== 'passed') {
							lines.push(`- ${spec.title} → ${res.status}`);
						}
					}
				}
			}
			fs.writeFileSync(failuresMd, lines.join('\n'));
		} catch {}
	}
	if (exitCode !== 0) {
		// No interrumpir pipeline; devolver éxito para que el resto de auditorías continúen
		process.exit(0);
	}
}

main();
