import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function main() {
  console.log('🔎 Inspección de duplicados en tablas de roles');

  // public.roles
  console.log('\n📚 Tabla public.roles');
  const dup1 = await sql`
    SELECT COALESCE(tenant_id::text,'(null)') AS tenant,
           lower(nombre) AS nombre_norm,
           COUNT(*) AS n
    FROM public.roles
    GROUP BY COALESCE(tenant_id::text,'(null)'), lower(nombre)
    HAVING COUNT(*) > 1
    ORDER BY 1,2
  `;
  if (dup1.rows.length === 0) console.log('   ✅ Sin duplicados');
  else console.table(dup1.rows);

  // rbac_roles
  console.log('\n📚 Tabla public.rbac_roles');
  const rrCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rbac_roles'
  `;
  if (rrCols.rows.length === 0) {
    console.log('   (no existe)');
  } else {
    const names = rrCols.rows.map((r: any) => r.column_name);
    const hasName = names.includes('name');
    const hasNombre = names.includes('nombre');
    const hasTenant = names.includes('tenant_id');
    if (hasName) {
      const dup = hasTenant
        ? await sql`SELECT COALESCE(tenant_id::text,'(null)') AS tenant, lower(name) AS name_norm, COUNT(*) AS n FROM public.rbac_roles GROUP BY COALESCE(tenant_id::text,'(null)'), lower(name) HAVING COUNT(*) > 1 ORDER BY 1,2`
        : await sql`SELECT lower(name) AS name_norm, COUNT(*) AS n FROM public.rbac_roles GROUP BY lower(name) HAVING COUNT(*) > 1 ORDER BY 1`;
      if (dup.rows.length === 0) console.log('   ✅ Sin duplicados');
      else console.table(dup.rows);
    } else if (hasNombre) {
      const dup = hasTenant
        ? await sql`SELECT COALESCE(tenant_id::text,'(null)') AS tenant, lower(nombre) AS name_norm, COUNT(*) AS n FROM public.rbac_roles GROUP BY COALESCE(tenant_id::text,'(null)'), lower(nombre) HAVING COUNT(*) > 1 ORDER BY 1,2`
        : await sql`SELECT lower(nombre) AS name_norm, COUNT(*) AS n FROM public.rbac_roles GROUP BY lower(nombre) HAVING COUNT(*) > 1 ORDER BY 1`;
      if (dup.rows.length === 0) console.log('   ✅ Sin duplicados');
      else console.table(dup.rows);
    } else {
      console.log('   (sin columnas de nombre reconocibles)');
    }
  }

  // roles_servicio
  console.log('\n📚 Tabla public.roles_servicio');
  const rsExists = await sql`
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roles_servicio'
  `;
  if (rsExists.rows.length === 0) {
    console.log('   (no existe)');
  } else {
    const dup = await sql`
      SELECT COALESCE(tenant_id::text,'(null)') AS tenant,
             lower(nombre) AS nombre_norm,
             COUNT(*) AS n
      FROM public.roles_servicio
      GROUP BY COALESCE(tenant_id::text,'(null)'), lower(nombre)
      HAVING COUNT(*) > 1
      ORDER BY 1,2
    `;
    if (dup.rows.length === 0) console.log('   ✅ Sin duplicados');
    else console.table(dup.rows);
  }

  // Columnas auxiliares
  console.log('\n🔧 Columnas en tablas RBAC:');
  const colQuery = async (t: string) => sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${t}
    ORDER BY ordinal_position
  `;
  const tables = ['rbac_roles', 'rbac_usuarios_roles', 'rbac_roles_permisos'];
  for (const t of tables) {
    const cols = await colQuery(t);
    if (cols.rows.length > 0) {
      console.log(`\n- ${t}`);
      console.table(cols.rows);
      const kind = await sql`SELECT relkind FROM pg_class WHERE relname=${t} LIMIT 1`;
      const relkind = kind.rows?.[0]?.relkind as string | undefined;
      const typeMap: Record<string, string> = { r: 'table', v: 'view', m: 'materialized view' } as any;
      console.log(`   type: ${typeMap[relkind || ''] || relkind || 'unknown'}`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


