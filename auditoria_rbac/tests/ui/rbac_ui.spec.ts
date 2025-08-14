import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const users = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'users.json'),'utf8'));
const oracle = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'rbac_oracle.json'),'utf8'));

const shotsDir = path.join(process.cwd(), 'outputs', 'ui_screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

function sidebarSelectorsForModule(mod: string) {
	// Heurística: link en sidebar por nombre del módulo
	return [`a[href*="/${mod}"]`, `nav >> text=${mod}`];
}

for (const u of users) {
	for (const moduleName of Object.keys(oracle)) {
		test(`${u.tenant}/${u.role} UI ${moduleName}`, async ({ page }, testInfo) => {
			await page.context().setExtraHTTPHeaders({ 'x-user-email': u.email });
			// Simular login simple por header si la app lo soporta vía cookie dev o fallback a baseURL
			await page.goto('/', { waitUntil: 'domcontentloaded' });
			// Navegar directo
			await page.goto(`/${moduleName}`);
			const allowedList = oracle[moduleName]?.[u.role]?.includes('read:list');
			if (!allowedList) {
				// Módulo no debería aparecer en sidebar
				for (const sel of sidebarSelectorsForModule(moduleName)) {
					const el = await page.$(sel);
					expect(el).toBeNull();
				}
			}
			// En página: validar ausencia/presencia de botones por rol
			const shouldCreate = oracle[moduleName]?.[u.role]?.includes('create');
			const shouldUpdate = oracle[moduleName]?.[u.role]?.includes('update');
			const shouldDelete = oracle[moduleName]?.[u.role]?.includes('delete');
			const shouldExport = oracle[moduleName]?.[u.role]?.includes('export');
			// Heurística de selectores comunes
			const createBtn = await page.$('button:has-text("Crear"), a:has-text("Nuevo"), [data-testid="create"]');
			const editBtn = await page.$('button:has-text("Editar"), [data-testid="edit"]');
			const deleteBtn = await page.$('button:has-text("Eliminar"), [data-testid="delete"]');
			const exportBtn = await page.$('button:has-text("Exportar"), [data-testid="export"]');
			if (createBtn) expect(!!createBtn).toBe(!!shouldCreate);
			if (editBtn) expect(!!editBtn).toBe(!!shouldUpdate);
			if (deleteBtn) expect(!!deleteBtn).toBe(!!shouldDelete);
			if (exportBtn) expect(!!exportBtn).toBe(!!shouldExport);
			if (testInfo.status !== testInfo.expectedStatus) {
				await page.screenshot({ path: path.join(shotsDir, `${u.tenant}_${u.role}_${moduleName}.png`), fullPage: true });
			}
		});
	}
}
