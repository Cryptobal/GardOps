import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos');

    // 1. Primero corregir la función fn_revertir_a_plan
    console.log('\n📝 Actualizando función fn_revertir_a_plan...');
    
    // Primero eliminar la función existente si tiene diferente firma
    await client.query(`DROP FUNCTION IF EXISTS as_turnos.fn_revertir_a_plan(bigint, text)`);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION as_turnos.fn_revertir_a_plan(
        p_pauta_id bigint,
        p_actor_ref text
      )
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_before jsonb;
        v_after  jsonb;
      BEGIN
        -- Obtener estado anterior
        SELECT jsonb_build_object(
          'estado', estado,
          'estado_ui', estado_ui,
          'meta', meta
        ) INTO v_before
        FROM public.as_turnos_pauta_mensual
        WHERE id = p_pauta_id;

        -- Revertir a planificado
        UPDATE public.as_turnos_pauta_mensual
        SET 
          estado = 'planificado',
          estado_ui = NULL,  -- NULL en lugar de 'plan' para que no quede bloqueado
          meta = NULL  -- Limpiar completamente el meta
        WHERE id = p_pauta_id;

        -- Obtener estado posterior
        SELECT jsonb_build_object(
          'estado', estado,
          'estado_ui', estado_ui,
          'meta', meta
        ) INTO v_after
        FROM public.as_turnos_pauta_mensual
        WHERE id = p_pauta_id;

        -- Registrar en logs
        INSERT INTO public.as_turnos_logs(
          actor_ref, 
          action, 
          pauta_id, 
          before_state, 
          after_state, 
          timestamp
        )
        VALUES (
          p_actor_ref,
          'revertir_a_plan',
          p_pauta_id,
          v_before::text,
          v_after::text,
          NOW()
        );
      END;
      $$;
    `);
    console.log('✅ Función fn_revertir_a_plan actualizada');

    // 2. Corregir la función fn_guardias_disponibles
    console.log('\n📝 Actualizando función fn_guardias_disponibles...');
    
    // Primero obtener la definición actual
    const { rows: funcDef } = await client.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'fn_guardias_disponibles' 
      AND pronamespace = 'as_turnos'::regnamespace
      LIMIT 1
    `);

    if (funcDef.length > 0) {
      console.log('Función actual encontrada, actualizando...');
      
      // Primero eliminar la función existente
      await client.query(`DROP FUNCTION IF EXISTS as_turnos.fn_guardias_disponibles(date,uuid,uuid,text)`);
      
      // Recrear la función corregida
      await client.query(`
        CREATE FUNCTION as_turnos.fn_guardias_disponibles(
          p_fecha date,
          p_instalacion_id uuid,
          p_rol_id uuid DEFAULT NULL,
          p_query text DEFAULT 'disponibles'
        )
        RETURNS TABLE(
          id uuid,
          nombre text,
          apellido_paterno text,
          apellido_materno text
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Crear tabla temporal con candidatos
          CREATE TEMP TABLE IF NOT EXISTS tmp_candidatos AS
          WITH permisos_guardias AS (
            SELECT DISTINCT ge.guardia_id
            FROM public.guardias_estructura ge
            WHERE (p_rol_id IS NULL OR ge.estructura_id = p_rol_id)
          ),
          guardias_activos AS (
            SELECT g.id, g.nombre, g.apellido_paterno, g.apellido_materno
            FROM public.guardias g
            JOIN permisos_guardias pg ON pg.guardia_id = g.id
            WHERE g.estado_activacion = true
          )
          SELECT * FROM guardias_activos;

          -- Si es query para todos los guardias disponibles
          IF p_query = 'disponibles' THEN
            RETURN QUERY
            WITH dia AS (
              SELECT p_fecha::date AS fecha
            ),
            puestos_rol AS (
              SELECT p.id
              FROM public.as_turnos_puestos_operativos p
              WHERE p.rol_id = p_rol_id
            ),
            ocupados_titular AS (
              SELECT pm.guardia_id AS guardia_id
              FROM public.as_turnos_pauta_mensual pm
              JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
              JOIN dia d ON make_date(pm.anio, pm.mes, pm.dia) = d.fecha
              WHERE pm.guardia_id IS NOT NULL
                AND po.instalacion_id = p_instalacion_id
                AND pm.puesto_id IN (SELECT id FROM puestos_rol)
            ),
            ocupados_cobertura AS (
              SELECT (pm.meta->>'cobertura_guardia_id')::uuid AS guardia_id
              FROM public.as_turnos_pauta_mensual pm
              JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
              JOIN dia d ON make_date(pm.anio, pm.mes, pm.dia) = d.fecha
              WHERE pm.meta ? 'cobertura_guardia_id'
                AND po.instalacion_id = p_instalacion_id
                AND pm.puesto_id IN (SELECT id FROM puestos_rol)
            )
            SELECT c.id, c.nombre, c.apellido_paterno, c.apellido_materno
            FROM tmp_candidatos c
            LEFT JOIN ocupados_titular  ot ON ot.guardia_id = c.id
            LEFT JOIN ocupados_cobertura oc ON oc.guardia_id = c.id
            WHERE ot.guardia_id IS NULL
              AND oc.guardia_id IS NULL
            ORDER BY c.apellido_paterno NULLS LAST, c.apellido_materno NULLS LAST, c.nombre;
          ELSE
            -- Query simple para todos los candidatos
            RETURN QUERY
            SELECT c.id, c.nombre, c.apellido_paterno, c.apellido_materno
            FROM tmp_candidatos c
            ORDER BY c.apellido_paterno NULLS LAST, c.apellido_materno NULLS LAST, c.nombre;
          END IF;

          -- Limpiar tabla temporal
          DROP TABLE IF EXISTS tmp_candidatos;
        END;
        $$;
      `);
      console.log('✅ Función fn_guardias_disponibles actualizada');
    } else {
      console.log('⚠️ Función fn_guardias_disponibles no encontrada');
    }

    // 3. Limpiar registros que quedaron en estado incorrecto
    console.log('\n🧹 Limpiando registros con estado_ui = "reemplazo" sin cobertura real...');
    const { rows: problemRecords } = await client.query(`
      SELECT id, estado, estado_ui, meta
      FROM public.as_turnos_pauta_mensual
      WHERE estado_ui = 'reemplazo' 
        AND (meta IS NULL OR NOT (meta ? 'cobertura_guardia_id'))
    `);

    if (problemRecords.length > 0) {
      console.log(`Encontrados ${problemRecords.length} registros con estado inconsistente`);
      
      await client.query(`
        UPDATE public.as_turnos_pauta_mensual
        SET estado_ui = NULL,
            meta = NULL
        WHERE estado_ui = 'reemplazo' 
          AND (meta IS NULL OR NOT (meta ? 'cobertura_guardia_id'))
      `);
      
      console.log('✅ Registros limpiados');
    } else {
      console.log('✅ No hay registros con estado inconsistente');
    }

    // 4. Verificar la vista
    console.log('\n🔍 Verificando vista as_turnos_v_pauta_diaria_dedup...');
    const { rows: viewCheck } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'as_turnos_v_pauta_diaria_dedup'
        AND column_name = 'estado_ui'
    `);

    if (viewCheck.length > 0) {
      console.log('✅ Vista tiene columna estado_ui');
    } else {
      console.log('⚠️ Vista no tiene columna estado_ui, puede necesitar actualización');
    }

    console.log('\n✅ Todas las correcciones aplicadas exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
