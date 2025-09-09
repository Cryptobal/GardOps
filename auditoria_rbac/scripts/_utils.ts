import fs from 'fs';
import path from 'path';

export function readJson<T=any>(p: string): T {
	return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

export function outputsDir() {
	const p = path.join(process.cwd(), 'outputs');
	fs.mkdirSync(p, { recursive: true });
	return p;
}
