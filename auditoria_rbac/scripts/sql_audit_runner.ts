import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function runSql(client: Client, filePath: string) {
	const sql = fs.readFileSync(filePath, 'utf8');
	const res = await client.query(sql);
	return res;
}

async function main() {
	const root = process.cwd();
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.warn('DATABASE_URL no definido. Saltando auditoría SQL.');
		return;
	}
	const client = new Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		const sqlDir = path.join(root, 'sql');
		const outDir = path.join(root, 'outputs', 'sql');
		fs.mkdirSync(outDir, { recursive: true });
		const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();
		for (const f of files) {
			const res = await runSql(client, path.join(sqlDir, f));
			const csv = [res.fields.map(f => f.name).join(',')]
				.concat(res.rows.map(r => res.fields.map(f => JSON.stringify(r[f.name] ?? '')).join(',')))
				.join('\n');
			fs.writeFileSync(path.join(outDir, f.replace(/\.sql$/, '.csv')), csv);
			console.log(`OK ${f}`);
		}
	} finally {
		await client.end();
	}
}

main().catch(e => { console.error(e); process.exit(1); });
