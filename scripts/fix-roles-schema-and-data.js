// Migración en JS (sin TS deps) para normalizar public.roles
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function q(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function dropUniqueOnSingleColumn(column) {
  const res = await q(
    `SELECT c.conname
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid AND t.relname = 'roles'
     JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
     WHERE c.contype = 'u'
       AND array_length(c.conkey,1) = 1
       AND (SELECT attname FROM pg_attribute WHERE attrelid = t.oid AND attnum = c.conkey[1]) = $1`,
    [column]
  );
  for (const row of res.rows) {
    const con = row.conname;
    console.log(`🔧 Dropping unique constraint ${con} on ${column}`);
    await q(`ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS "${con}"`);
  }
}

async function dropIndexIfExists(name) {
  console.log(`🔧 Dropping index if exists ${name}`);
  // No se puede parametrizar directamente nombres de índice en DO $$ ... $$, usar string literal con sanitización básica
  const safe = String(name).replace(/[^a-zA-Z0-9_]/g, '');
  await q(`DO $$ BEGIN IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = '${safe}' AND n.nspname='public') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.${safe}';
  END IF; END $$;`);
}

async function ensureCompositeUnique() {
  await q(`CREATE UNIQUE INDEX IF NOT EXISTS uk_roles_tenant_lower_nombre
           ON public.roles ((COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(nombre));`);
}

async function deduplicateByTenantAndName() {
  console.log('🔎 Buscando duplicados por (tenant_id, lower(nombre))...');
  const dups = await q(`
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
  for (const row of dups.rows) {
    const newName = `${row.nombre} (dup ${counter++})`;
    await q(`UPDATE public.roles SET nombre = $1 WHERE id = $2::uuid`, [newName, row.id]);
  }
  console.log('✅ Duplicados renombrados');
}

async function cleanCrossTenantAssignments() {
  console.log('🧹 Limpiando asignaciones usuarios_roles cruzadas de tenant...');
  const res = await q(`
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
  console.log(`✅ Eliminadas ${res.rowCount || 0} asignaciones inválidas`);
}

async function main() {
  console.log('\n🚀 Normalizando esquema y datos de public.roles...');

  await dropUniqueOnSingleColumn('tenant_id');
  await dropUniqueOnSingleColumn('nombre');

  await deduplicateByTenantAndName();
  await dropIndexIfExists('roles_nombre_key');
  await ensureCompositeUnique();
  await cleanCrossTenantAssignments();

  console.log('🎉 Migración completada.');
  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Error en migración:', e);
  await pool.end();
  process.exit(1);
});


