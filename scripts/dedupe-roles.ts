import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env.local (si existe)
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function dedupeRoles() {
  console.log('🧹 Iniciando deduplicación de roles (roles y rbac_roles) ...');

  try {
    const tx = sql;
    // ==========================
    // Tabla: public.roles
    // ==========================
    console.log('\n➡️  Procesando tabla public.roles');

    // 1) Reasignar usuarios_roles de duplicados al keep_id
    await tx`
      WITH d AS (
        SELECT tenant_id,
               nombre_norm,
               (ids)[1]::uuid AS keep_id,
               unnest(ids[2:array_length(ids,1)])::uuid AS dup_id
        FROM (
          SELECT tenant_id,
                 lower(nombre) AS nombre_norm,
                 array_agg(id ORDER BY created_at NULLS FIRST, id) AS ids
          FROM public.roles
          GROUP BY tenant_id, lower(nombre)
          HAVING COUNT(*) > 1
        ) g
      )
      INSERT INTO public.usuarios_roles (usuario_id, rol_id)
      SELECT ur.usuario_id, d.keep_id
      FROM public.usuarios_roles ur
      JOIN d ON ur.rol_id = d.dup_id
      ON CONFLICT (usuario_id, rol_id) DO NOTHING;
    `;

    // 2) Reasignar roles_permisos de duplicados al keep_id
    await tx`
      WITH d AS (
        SELECT tenant_id,
               nombre_norm,
               (ids)[1]::uuid AS keep_id,
               unnest(ids[2:array_length(ids,1)])::uuid AS dup_id
        FROM (
          SELECT tenant_id,
                 lower(nombre) AS nombre_norm,
                 array_agg(id ORDER BY created_at NULLS FIRST, id) AS ids
          FROM public.roles
          GROUP BY tenant_id, lower(nombre)
          HAVING COUNT(*) > 1
        ) g
      )
      INSERT INTO public.roles_permisos (rol_id, permiso_id)
      SELECT d.keep_id, rp.permiso_id
      FROM public.roles_permisos rp
      JOIN d ON rp.rol_id = d.dup_id
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    `;

    // 3) Eliminar roles duplicados
    const delRoles = await tx`
      WITH d AS (
        SELECT unnest(ids[2:array_length(ids,1)])::uuid AS dup_id
        FROM (
          SELECT array_agg(id ORDER BY created_at NULLS FIRST, id) AS ids
          FROM public.roles
          GROUP BY tenant_id, lower(nombre)
          HAVING COUNT(*) > 1
        ) g
      )
      DELETE FROM public.roles r
      USING d
      WHERE r.id = d.dup_id
      RETURNING r.id::text AS id;
    `;
    console.log(`   - Eliminados en roles: ${delRoles.rowCount ?? 0}`);

    // 5) Índice único para prevenir futuros duplicados (normalizando tenant_id NULL)
    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_tenant_lower_nombre
      ON public.roles (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        lower(nombre)
      );
    `;

    // ==========================
    // rbac_* son vistas derivadas; se actualizarán al limpiar 'roles'.
    // ==========================
    console.log('\nℹ️  Tablas rbac_* detectadas como vistas. Se omiten (se reflejan desde public.roles).');

    // ==========================
    // Tabla: public.roles_servicio (si existe)
    // ==========================
    console.log('\n➡️  Procesando tabla public.roles_servicio (si existe)');

    await tx`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'roles_servicio'
        ) THEN
          WITH d AS (
            SELECT unnest(ids[2:array_length(ids,1)])::uuid AS dup_id
            FROM (
              SELECT array_agg(id ORDER BY creado_en NULLS FIRST, id) AS ids
              FROM public.roles_servicio
              GROUP BY tenant_id, lower(nombre)
              HAVING COUNT(*) > 1
            ) g
          )
          DELETE FROM public.roles_servicio rs
          USING d
          WHERE rs.id = d.dup_id;
        END IF;
      END $$;
    `;

    // Índice único para prevenir futuros duplicados
    await tx`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'roles_servicio'
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_servicio_tenant_lower_nombre
          ON public.roles_servicio (
            COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
            lower(nombre)
          );
        END IF;
      END $$;
    `;
    console.log('\n✅ Deduplicación completada');
  } catch (error) {
    throw error;
  }
}

dedupeRoles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error ejecutando dedupe-roles:', err);
    process.exit(1);
  });


