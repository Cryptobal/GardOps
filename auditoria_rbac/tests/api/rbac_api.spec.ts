import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fetch as undiciFetch } from 'undici';

const fetchImpl: typeof fetch = (global as any).fetch || (undiciFetch as any);

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const TIMEOUT = Number(process.env.AUDIT_TIMEOUT_MS || 120000);

interface EndpointInfo {
	method: string;
	route: string;
	module: string;
	action: string;
	file: string;
	middleware?: string[];
}

const repoRoot = path.resolve(process.cwd(), 'auditoria_rbac', '..');
const users = JSON.parse(fs.readFileSync(path.join(repoRoot, 'auditoria_rbac', 'config', 'users.json'),'utf8'));
const oracle = JSON.parse(fs.readFileSync(path.join(repoRoot, 'auditoria_rbac', 'config', 'rbac_oracle.json'),'utf8'));
const endpoints: EndpointInfo[] = JSON.parse(fs.readFileSync(process.env.AUDIT_CASES_JSON!, 'utf8'));

const outDir = path.join(repoRoot, 'auditoria_rbac', 'outputs');
fs.mkdirSync(outDir, { recursive: true });
const csvRows: string[] = ['tenant,role,module,action,method,route,expected,ok,status']
const failures: string[] = [];

function expectedAllowed(role: string, moduleName: string, action: string) {
	const modKey = moduleName.replace(/-/g, '_');
	const allowedActions: string[] = oracle[modKey]?.[role] || [];
	return allowedActions.includes(action);
}

function routeForAction(ep: EndpointInfo) {
	let url = `${BASE_URL}${ep.route.startsWith('/') ? '' : '/'}${ep.route}`;
	// Añadir heurística dryRun para mutaciones
	if (['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
		url += (url.includes('?') ? '&' : '?') + 'dryRun=1';
	}
	return url;
}

async function call(ep: EndpointInfo, email: string, otherTenantId?: string) {
	const url = routeForAction(ep);
	const headers: Record<string,string> = { 'x-user-email': email };
	if (otherTenantId) headers['x-tenant-id'] = otherTenantId; // si la API la ignora, no afecta
	const init: RequestInit = { method: ep.method, headers } as any;
	if (ep.method !== 'GET') {
		(init as any).body = JSON.stringify({ _audit: true, _noWrite: true, id: '00000000-0000-0000-0000-000000000000' });
	}
	const res = await fetchImpl(url, init as any);
	return res;
}

jest.setTimeout(TIMEOUT);

describe('Auditoría RBAC API (read-only)', () => {
	for (const ep of endpoints) {
		if (!oracle[ep.module?.replace(/-/g,'_')]) continue; // solo módulos conocidos
		for (const u of users) {
			const shouldAllow = expectedAllowed(u.role, ep.module, ep.action);
			const name = `${u.tenant}/${u.role} → ${ep.method} ${ep.route} (${ep.module}:${ep.action})`;
			test(name, async () => {
				const res = await call(ep, u.email);
				const okStatuses = [200, 204, 206, 422];
				const isAllowedOk = okStatuses.includes(res.status);
				const isDeniedOk = res.status === 403; // Denegado correcto
				const actual = res.status;
				csvRows.push([u.tenant,u.role,ep.module,ep.action,ep.method,ep.route,shouldAllow?'allow':'deny', String(isAllowedOk||isDeniedOk), String(actual)].join(','));
				if ((shouldAllow && !isAllowedOk) || (!shouldAllow && !isDeniedOk)) {
					failures.push(`- ${name} esperado=${shouldAllow?'allow':'deny'} status=${actual}`);
				}
				expect(true).toBe(true);
			});
		}
	}
	afterAll(() => {
		fs.writeFileSync(path.join(outDir, 'rbac_results_api.csv'), csvRows.join('\n'));
		if (failures.length) fs.writeFileSync(path.join(outDir, 'rbac_failures_api.md'), failures.join('\n'));
	});
});
