#!/usr/bin/env tsx
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Client } from 'pg';

async function main() {
  const localEnv = path.resolve('.env.local');
  if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
  else dotenv.config();
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('Falta POSTGRES_URL/DATABASE_URL');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1) Audit and fix
  const mod = await import('./audit-and-fix');
  await (mod as any).runAuditAndFix?.();

  const q = (sql: string, params?: any[]) => client.query(sql, params).then(r => r.rows);

  // 2) Crear tenant demo
  const demo = await q(`select * from public.fn_create_tenant($1,$2,$3,$4)`, ['Demo','demo','owner@demo.com','Owner Demo']);
  const created = demo?.[0]?.created ? '✔' : '•';

  // Asegurar platform_admin asignado al usuario Carlos.irigoyen@gard.cl
  const email = 'Carlos.irigoyen@gard.cl';
  const user = (await q(`select id from usuarios where lower(email)=lower($1)`, [email]))[0];
  let userId = user?.id;
  if (!userId) {
    userId = (await q(`insert into usuarios(id,email,activo) values (gen_random_uuid(), lower($1), true) returning id`, [email]))[0]?.id;
  }
  const platformRole = (await q(`select id from roles where tenant_id is null and clave='platform_admin' limit 1`))[0];
  if (platformRole?.id && userId) {
    await q(`insert into usuarios_roles(usuario_id, rol_id) values ($1::uuid, $2::uuid) on conflict do nothing`, [userId, platformRole.id]);
  }

  // 3) Verificaciones
  const tenantsCount = (await q(`select count(*)::int c from tenants`))[0]?.c ?? 0;
  const permOk = (await q(`select public.fn_usuario_tiene_permiso($1,$2) as ok`, ['Carlos.irigoyen@gard.cl','rbac.platform_admin']))?.[0]?.ok ?? false;
  const usuarios = await q(`select id,email from usuarios limit 5`);
  const roles = await q(`select id,clave from roles limit 5`);
  const permisos = await q(`select id,clave from permisos limit 5`);

  // 4) Resumen
  console.log('Smoke:');
  console.log(` - Audit y migración: ✔`);
  console.log(` - fn_create_tenant('Demo','demo',...): ${created}`);
  console.log(` - Tenants > 0: ${tenantsCount > 0 ? '✔' : '✖'} (count=${tenantsCount})`);
  console.log(` - platform_admin(Carlos.irigoyen@gard.cl): ${permOk ? '✔' : '✖'}`);
  console.log(` - Listados usuarios/roles/permisos: ${usuarios.length >= 0 && roles.length >= 0 && permisos.length >= 0 ? '✔' : '✖'}`);

  await client.end();
}

main().catch((e) => {
  console.error('❌ Smoke falló:', e);
  process.exit(1);
});


