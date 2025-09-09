import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function main() {
  const view = (process.argv[2] || '').trim();
  if (!view) {
    console.error('Uso: tsx scripts/show-viewdef.ts <view_name>');
    process.exit(1);
  }
  const res = await sql`
    SELECT pg_get_viewdef(('public.' || ${view})::regclass, true) AS def
  `;
  console.log(`\n📄 Definición de la vista ${view} (public):\n`);
  console.log(res.rows?.[0]?.def || '(no encontrada)');
}

main();


