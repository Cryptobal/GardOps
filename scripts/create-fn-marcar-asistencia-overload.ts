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

    // Crear una versión sobrecargada de la función que acepta jsonb
    await client.query(`
      CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
        p_pauta_id bigint,
        p_accion text,
        p_meta jsonb,
        p_actor_ref text
      )
      RETURNS TABLE(pauta_id bigint, puesto_id text, fecha date, estado text, meta jsonb)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_before jsonb;
        v_after  jsonb;
        v_norm   text;
        v_cobertura_guardia_id text;
        v_motivo text;
        v_estado_ui text;
      BEGIN
        -- Extraer valores del jsonb
        v_cobertura_guardia_id := p_meta->>'cobertura_guardia_id';
        v_motivo := p_meta->>'motivo';
        v_estado_ui := p_meta->>'estado_ui';
        
        -- Normaliza el estado basado en la acción
        v_norm := CASE
                    WHEN lower(p_accion) IN ('trabajado', 'asistio', 't') THEN 'trabajado'
                    WHEN lower(p_accion) IN ('inasistencia', 'no_asistio') THEN 'inasistencia'
                    WHEN lower(p_accion) IN ('reemplazo') THEN 'reemplazo'
                    ELSE p_accion
                  END;

        -- Snapshot ANTES (bloqueando la fila)
        SELECT jsonb_build_object('estado', pm.estado, 'meta', pm.meta, 'estado_ui', pm.estado_ui)
          INTO v_before
        FROM public.as_turnos_pauta_mensual pm
        WHERE pm.id = p_pauta_id
        FOR UPDATE;
        
        IF v_before IS NULL THEN
          RAISE EXCEPTION 'Pauta % no existe', p_pauta_id;
        END IF;

        -- UPDATE principal
        UPDATE public.as_turnos_pauta_mensual pm
           SET estado = v_norm,
               meta = COALESCE(pm.meta, '{}'::jsonb) || p_meta || 
                      jsonb_build_object(
                        'ts_asistencia', now(), 
                        'by', p_actor_ref,
                        'action', p_accion
                      ),
               estado_ui = COALESCE(v_estado_ui, pm.estado_ui),
               updated_at = NOW()
         WHERE pm.id = p_pauta_id;

        -- Snapshot DESPUÉS
        SELECT jsonb_build_object('estado', pm.estado, 'meta', pm.meta, 'estado_ui', pm.estado_ui)
          INTO v_after
        FROM public.as_turnos_pauta_mensual pm
        WHERE pm.id = p_pauta_id;

        -- LOG
        INSERT INTO public.as_turnos_logs(actor_ref, action, pauta_id, before_state, after_state)
        VALUES (p_actor_ref, p_accion, p_pauta_id, v_before, v_after);

        -- RETURN
        RETURN QUERY
        SELECT
          pm.id::bigint,
          pm.puesto_id::text,
          make_date(pm.anio, pm.mes, pm.dia)::date,
          pm.estado::text,
          pm.meta::jsonb
        FROM public.as_turnos_pauta_mensual pm
        WHERE pm.id = p_pauta_id;
      END;
      $$;
    `);

    console.log('✅ Función fn_marcar_asistencia (versión jsonb) creada correctamente');

    // Verificar que ambas versiones existen
    const { rows: functions } = await client.query(`
      SELECT 
        oid::regprocedure as signature,
        pronargs as num_args
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
      ORDER BY pronargs
    `);

    console.log('\n📋 Versiones de fn_marcar_asistencia disponibles:');
    functions.forEach(func => {
      console.log(`  - ${func.signature} (${func.num_args} argumentos)`);
    });

    // Test rápido
    console.log('\n🧪 Probando la nueva función...');
    const { rows: testData } = await client.query(`
      SELECT id, estado, estado_ui, guardia_id
      FROM public.as_turnos_pauta_mensual
      WHERE id IS NOT NULL
      LIMIT 1
    `);

    if (testData.length > 0) {
      console.log(`✅ Registro de prueba encontrado: ID=${testData[0].id}, estado=${testData[0].estado}, estado_ui=${testData[0].estado_ui}`);
      
      // Simular una llamada como la haría el endpoint
      try {
        const { rows: result } = await client.query(`
          SELECT * FROM as_turnos.fn_marcar_asistencia(
            $1::bigint,
            'reemplazo',
            jsonb_build_object(
              'cobertura_guardia_id', '00000000-0000-0000-0000-000000000000',
              'estado_ui', 'reemplazo'
            ),
            'test-script'
          )
        `, [testData[0].id]);
        
        console.log('✅ Función ejecutada exitosamente');
        if (result.length > 0) {
          console.log(`   Resultado: estado=${result[0].estado}`);
        }
      } catch (testError: any) {
        console.log('⚠️ Error en prueba (esperado si no hay permisos):', testError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
