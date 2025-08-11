#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

type CheckResult = { ok: boolean; detail?: string };

function envSetup() {
  const localEnv = path.resolve('.env.local');
  if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
  else dotenv.config();
}

function getDbUrl(): string {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) throw new Error('Falta POSTGRES_URL/DATABASE_URL en el entorno');
  return url;
}

async function runQuery<T = any>(client: Client, sql: string, params?: any[]): Promise<T[]> {
  const { rows } = await client.query(sql, params);
  return rows as T[];
}

async function checkTable(client: Client, tableName: string): Promise<CheckResult> {
  const rows = await runQuery(client, `select to_regclass($1) as exists`, [tableName]);
  const ok = Boolean(rows[0]?.exists);
  return { ok, detail: ok ? 'exists' : 'missing' };
}

async function checkFunction(client: Client, fnName: string, argTypes: string[]): Promise<CheckResult> {
  const rows = await runQuery(client, `
    select exists(
      select 1 from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=$1 and p.proargtypes::text like $2
    ) as exists
  `, [fnName, `%`]);
  const ok = Boolean(rows[0]?.exists);
  return { ok, detail: ok ? 'exists' : 'missing' };
}

async function applyMigration(client: Client, migrationFile: string): Promise<void> {
  const sql = fs.readFileSync(migrationFile, 'utf8');
  await client.query(sql);
}

async function smoke(client: Client): Promise<void> {
  const counts = await runQuery(client, `
    select 'tenants' as t, count(*) c from tenants
    union all select 'usuarios', count(*) from usuarios
    union all select 'roles', count(*) from roles
    union all select 'permisos', count(*) from permisos
  `);
  const describeUsuarios = await runQuery(client, `
    select column_name, data_type from information_schema.columns where table_name='usuarios' order by ordinal_position
  `);
  console.log('Conteos:', counts);
  console.log('Describe usuarios:', describeUsuarios);
}

export async function runAuditAndFix() {
  envSetup();
  const dbUrl = getDbUrl();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const requiredTables = ['tenants', 'usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos'];
  const requiredFunctions: Array<[string, string[]]> = [
    ['fn_usuario_tiene_permiso', ['text', 'text']],
    ['fn_create_tenant', ['text', 'text', 'text', 'text']]
  ];

  const missing: string[] = [];

  // Checks
  for (const t of requiredTables) {
    const r = await checkTable(client, t);
    if (!r.ok) missing.push(`table:${t}`);
  }
  for (const [fn] of requiredFunctions) {
    const r = await checkFunction(client, fn, []);
    if (!r.ok) missing.push(`function:${fn}`);
  }

  if (missing.length > 0) {
    console.log('Faltantes detectados:', missing.join(', '));
    const migrationPath = path.resolve('scripts/rbac/migration.sql');
    await applyMigration(client, migrationPath);
    console.log('✅ Migración aplicada (idempotente)');
  } else {
    console.log('✅ Esquema RBAC OK (sin cambios)');
  }

  // Smoke checks
  await smoke(client);

  // Resumen
  console.log('Resumen:');
  for (const t of requiredTables) {
    const r = await checkTable(client, t);
    console.log(` - ${t}: ${r.ok ? '✔' : '✖'}`);
  }
  for (const [fn] of requiredFunctions) {
    const r = await checkFunction(client, fn, []);
    console.log(` - ${fn}: ${r.ok ? '✔' : '✖'}`);
  }

  await client.end();
}

if (require.main === module) {
  runAuditAndFix().catch((e) => {
    console.error('❌ Error en auditoría RBAC:', e);
    process.exit(1);
  });
}


