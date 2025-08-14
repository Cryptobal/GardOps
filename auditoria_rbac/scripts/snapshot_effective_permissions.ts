import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function fetchJson(url: string, init: any = {}) {
	const res = await fetch(url, init);
	const text = await res.text();
	try { return JSON.parse(text); } catch { return { ok:false, parseError:true, raw:text, status: res.status }; }
}

async function main() {
    const repoRoot = path.resolve(process.cwd());
    const baseUrl = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
    const users = JSON.parse(fs.readFileSync(path.join(repoRoot, 'auditoria_rbac', 'config', 'users.json'),'utf8')) as Array<{tenant:string;role:string;email:string}>;
    const oracle = JSON.parse(fs.readFileSync(path.join(repoRoot, 'auditoria_rbac', 'config', 'rbac_oracle.json'),'utf8')) as Record<string, Record<string, string[]>>;
    const outDir = path.join(repoRoot, 'auditoria_rbac', 'outputs');
	fs.mkdirSync(outDir, { recursive: true });

	const perms: string[] = Array.from(new Set(
		Object.values(oracle).flatMap((roleMap) => Object.values(roleMap).flat())
	));
	for (const u of users) {
		const fileSafe = `${u.tenant}_${u.role}`.toLowerCase();
		const result: Record<string, boolean> = {};
		for (const perm of perms) {
			const url1 = `${baseUrl}/api/rbac/can?perm=${encodeURIComponent(perm)}`;
			const url2 = `${baseUrl}/api/me/permissions?perm=${encodeURIComponent(perm)}`;
			let data = await fetchJson(url1, { headers: { 'x-user-email': u.email } });
			if (!data || typeof data.allowed !== 'boolean') {
				data = await fetchJson(url2, { headers: { 'x-user-email': u.email } });
			}
			result[perm] = !!data?.allowed;
		}
		fs.writeFileSync(path.join(outDir, `effective_permissions_${fileSafe}.json`), JSON.stringify({ user:u, result }, null, 2));
	}
	console.log('Snapshots generados en outputs/*.json');
}

main().catch(e => { console.error(e); process.exit(1); });
