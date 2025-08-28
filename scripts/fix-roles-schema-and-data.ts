/**
 * Migración segura para normalizar la tabla public.roles en Neon.
 * - Elimina UNIQUE erróneos sobre tenant_id y nombre.
 * - Asegura índice único por (COALESCE(tenant_id,'000...'), lower(nombre)).
 * - Deduplica roles dentro del mismo tenant (renombrando duplicados con sufijo).
 * - Limpia asignaciones usuarios_roles cruzadas de tenant.
 *
 * Idempotente: puede correrse múltiples veces.
 */
import { query } from "../src/lib/database";

async function dropUniqueOnSingleColumn(column: string) {
  const res = await query(
    `SELECT c.conname
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid AND t.relname = 'roles'
     JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
     WHERE c.contype = 'u'
       AND array_length(c.conkey,1) = 1
       AND (SELECT attname FROM pg_attribute WHERE attrelid = t.oid AND attnum = c.conkey[1]) = $1`,
    [column]
  );
  for (const row of res.rows as Array<{ conname: string }>) {
    const con = row.conname;
    console.log(`🔧 Dropping unique constraint ${con} on ${column}`);
    await query(`ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS "${con}"`);
  }
}

async function dropIndexIfExists(name: string) {
  console.log(`🔧 Dropping index if exists ${name}`);
  await query(`DO $$ BEGIN IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = $1 AND n.nspname='public') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.'||quote_ident($1);
  END IF; END $$;`, [name]);
}

async function ensureCompositeUnique() {
  // Índice único compuesto, case-insensitive por nombre y tolerando NULL en tenant
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uk_roles_tenant_lower_nombre
               ON public.roles ((COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(nombre));`);
}

async function deduplicateByTenantAndName() {
  console.log('🔎 Buscando duplicados por (tenant_id, lower(nombre))...');
  const dups = await query(`
    WITH ranked AS (
      SELECT id, tenant_id, nombre,
             row_number() OVER (PARTITION BY COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), lower(nombre)
                                ORDER BY created_at NULLS FIRST, id) AS rn
      FROM public.roles
    )
    SELECT id, tenant_id, nombre, rn FROM ranked WHERE rn > 1`);

  if (dups.rows.length === 0) {
    console.log('✅ Sin duplicados');
    return;
  }

  console.log(`⚠️ Encontrados ${dups.rows.length} duplicados. Renombrando con sufijo...`);
  let counter = 1;
  for (const row of dups.rows as Array<{ id: string; nombre: string }>) {
    const newName = `${row.nombre} (dup ${counter++})`;
    await query(`UPDATE public.roles SET nombre = $1 WHERE id = $2::uuid`, [newName, row.id]);
  }
  console.log('✅ Duplicados renombrados');
}

async function cleanCrossTenantAssignments() {
  console.log('🧹 Limpiando asignaciones usuarios_roles cruzadas de tenant...');
  const res = await query(`
    WITH bad AS (
      SELECT ur.usuario_id, ur.rol_id
      FROM public.usuarios_roles ur
      JOIN public.usuarios u ON u.id = ur.usuario_id
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE r.tenant_id IS NOT NULL AND u.tenant_id IS DISTINCT FROM r.tenant_id
    )
    DELETE FROM public.usuarios_roles ur
    USING bad
    WHERE ur.usuario_id = bad.usuario_id AND ur.rol_id = bad.rol_id
    RETURNING ur.usuario_id, ur.rol_id`);
  console.log(`✅ Eliminadas ${res.rowCount ?? 0} asignaciones inválidas`);
}

async function main() {
  console.log('\n🚀 Normalizando esquema y datos de public.roles...');

  // 1) Eliminar UNIQUE sobre tenant_id y nombre (si existen)
  await dropUniqueOnSingleColumn('tenant_id');
  await dropUniqueOnSingleColumn('nombre');

  // 2) Deduplicar por tenant/nombre (antes de re-forzar unicidad)
  await deduplicateByTenantAndName();

  // 3) Asegurar índice único correcto
  // (opcionalmente eliminar un índice antiguo por nombre plano si existiese)
  await dropIndexIfExists('roles_nombre_key');
  await ensureCompositeUnique();

  // 4) Limpiar asignaciones cruzadas
  await cleanCrossTenantAssignments();

  console.log('🎉 Migración completada.');
}

main().catch((e) => {
  console.error('❌ Error en migración:', e);
  process.exit(1);
});


