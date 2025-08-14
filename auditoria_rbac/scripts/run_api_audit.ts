import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function main() {
	const repoRoot = path.resolve(process.cwd());
	const endpointsPath = path.join(repoRoot, 'auditoria_rbac', 'outputs', 'rbac_endpoint_map.json');
	const oraclePath = path.join(repoRoot, 'auditoria_rbac', 'config', 'rbac_oracle.json');
	if (!fs.existsSync(endpointsPath)) throw new Error('Falta outputs/rbac_endpoint_map.json. Ejecute audit:gen-endpoints');
	if (!fs.existsSync(oraclePath)) throw new Error('Falta auditoria_rbac/config/rbac_oracle.json');
	const env = { ...process.env } as any;
	env.AUDIT_CASES_JSON = endpointsPath;
	const jestConfig = path.join(repoRoot, 'auditoria_rbac', 'tests', 'api', 'jest.config.js');
	execSync(`node ./node_modules/jest/bin/jest.js --config ${jestConfig} --runInBand`, { stdio: 'inherit', env });
}

main();
