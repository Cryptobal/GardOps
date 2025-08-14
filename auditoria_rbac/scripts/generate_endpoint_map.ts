import 'dotenv/config';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

interface EndpointInfo {
	method: string;
	route: string;
	module: string;
	action: string;
	file: string;
	middleware?: string[];
	flags?: string[];
}

function inferAction(method: string, routePath: string): { module: string; action: string } {
	const cleaned = routePath.replace(/^api\//, '').replace(/\/+$/, '');
	const parts = cleaned.split('/').filter(Boolean);
	const mod = parts[0] || '';
	const lastSeg = parts[parts.length - 1] || '';
	const hasId = parts.some(p => /^\[.+\]$/.test(p));
	if (method === 'GET') {
		if (/^export/.test(lastSeg) || /export/.test(cleaned)) return { module: mod, action: 'export' };
		return { module: mod, action: hasId ? 'read:detail' : 'read:list' };
	}
	if (method === 'POST') return { module: mod, action: 'create' };
	if (method === 'PUT' || method === 'PATCH') return { module: mod, action: 'update' };
	if (method === 'DELETE') return { module: mod, action: 'delete' };
	return { module: mod, action: 'unknown' };
}

async function main() {
	const root = path.resolve(process.cwd(), '..');
	const apiPattern = 'src/app/api/**/route.ts';
	const files = await fg(apiPattern, { cwd: root, absolute: true });
	const endpoints: EndpointInfo[] = [];
	const findings: string[] = [];

	for (const file of files) {
		const rel = path.relative(root, file);
		const code = fs.readFileSync(file, 'utf8');
		const methodMatches = Array.from(code.matchAll(/export\s+(?:async\s+function\s+|const\s+)(GET|POST|PUT|DELETE|PATCH)\b/g));
		const methods = methodMatches.map(m => (m[1] || '').toUpperCase());
		const routePart = rel.replace(/route.ts$/, '').replace(/^src\/app\//, ''); // e.g. api/guardias/
		const routePath = routePart.replace(/\/+$/, '');

		let middleware: string[] = [];
		if (/withPermission\(/.test(code)) middleware.push('withPermission');
		if (/requirePermission\(/.test(code)) middleware.push('requirePermission');
		if (/userHasPerm\(/.test(code)) middleware.push('userHasPerm-inline');

		for (const method of methods) {
			const { module, action } = inferAction(method, routePath);
			const httpPath = `/${routePath}`.replace(/^\/api\//, '/api/');
			const ep: EndpointInfo = { method, route: httpPath, module, action, file: rel, middleware };
			endpoints.push(ep);
			if (middleware.length === 0 && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
				findings.push(`P1: ${method} ${ep.route} sin middleware de autorización (${rel})`);
			}
		}
	}

	const outDir = path.resolve(process.cwd(), 'outputs');
	fs.mkdirSync(outDir, { recursive: true });
	fs.writeFileSync(path.join(outDir, 'rbac_endpoint_map.json'), JSON.stringify(endpoints, null, 2));
	const md = [
		'# Auditoría estática de endpoints RBAC',
		'',
		'## Endpoints detectados',
		'```json',
		JSON.stringify(endpoints, null, 2),
		'```',
		'',
		'## Hallazgos',
		...(findings.length ? findings : ['Sin hallazgos críticos detectados por heurística']).map(x => `- ${x}`)
	].join('\n');
	fs.writeFileSync(path.join(outDir, 'rbac_static_audit.md'), md);
	console.log(`Generado outputs/rbac_endpoint_map.json con ${endpoints.length} endpoints`);
}

main().catch(e => { console.error(e); process.exit(1); });
