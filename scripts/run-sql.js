#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Uso: node scripts/run-sql.js <ruta_al_sql>');
    process.exit(1);
  }
  const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error(`No existe el archivo SQL: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`✅ Ejecutado SQL: ${path.basename(sqlPath)}`);
  } catch (err) {
    console.error('❌ Error ejecutando SQL:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();


