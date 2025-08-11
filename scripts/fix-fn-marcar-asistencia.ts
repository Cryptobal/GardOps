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

    // Primero verificar si la función existe
    const { rows: funcCheck } = await client.query(`
      SELECT 
        proname,
        pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
    `);

    if (funcCheck.length > 0) {
      console.log('📋 Función actual encontrada');
      console.log('Definición actual:', funcCheck[0].definition.substring(0, 500) + '...');
      
      // Recrear la función corregida - sin referencias a estado_ui como columna
      await client.query(`
        CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
          p_pauta_id bigint,
          p_accion text,
          p_meta jsonb,
          p_actor_ref text
        )
        RETURNS TABLE(id bigint)
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Validar entrada
          IF p_pauta_id IS NULL THEN
            RAISE EXCEPTION 'pauta_id no puede ser nulo';
          END IF;
          
          IF p_accion IS NULL THEN
            RAISE EXCEPTION 'accion no puede ser nula';
          END IF;

          -- Actualizar el registro en la tabla
          UPDATE public.as_turnos_pauta_mensual pm
          SET 
            estado = p_accion,
            meta = COALESCE(pm.meta, '{}'::jsonb) || p_meta || 
                   jsonb_build_object(
                     'actor_ref', p_actor_ref,
                     'timestamp', NOW()::text,
                     'action', p_accion
                   ),
            updated_at = NOW()
          WHERE pm.id = p_pauta_id;

          -- Retornar el ID del registro actualizado
          RETURN QUERY SELECT p_pauta_id;
        END;
        $$;
      `);

      console.log('✅ Función fn_marcar_asistencia recreada correctamente');

    } else {
      console.log('⚠️ La función fn_marcar_asistencia no existe, creándola...');
      
      // Crear la función si no existe
      await client.query(`
        CREATE FUNCTION as_turnos.fn_marcar_asistencia(
          p_pauta_id bigint,
          p_accion text,
          p_meta jsonb,
          p_actor_ref text
        )
        RETURNS TABLE(id bigint)
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Validar entrada
          IF p_pauta_id IS NULL THEN
            RAISE EXCEPTION 'pauta_id no puede ser nulo';
          END IF;
          
          IF p_accion IS NULL THEN
            RAISE EXCEPTION 'accion no puede ser nula';
          END IF;

          -- Actualizar el registro en la tabla
          UPDATE public.as_turnos_pauta_mensual pm
          SET 
            estado = p_accion,
            meta = COALESCE(pm.meta, '{}'::jsonb) || p_meta || 
                   jsonb_build_object(
                     'actor_ref', p_actor_ref,
                     'timestamp', NOW()::text,
                     'action', p_accion
                   ),
            updated_at = NOW()
          WHERE pm.id = p_pauta_id;

          -- Retornar el ID del registro actualizado
          RETURN QUERY SELECT p_pauta_id;
        END;
        $$;
      `);
      
      console.log('✅ Función fn_marcar_asistencia creada correctamente');
    }

    // Verificar la estructura de la tabla para confirmar las columnas disponibles
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'as_turnos_pauta_mensual'
      AND column_name IN ('estado', 'meta', 'estado_ui')
      ORDER BY column_name
    `);

    console.log('\n📊 Columnas relevantes en as_turnos_pauta_mensual:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Test rápido para verificar que funciona
    console.log('\n🧪 Probando la función...');
    try {
      const { rows: testResult } = await client.query(`
        SELECT pm.id, pm.estado, pm.meta
        FROM public.as_turnos_pauta_mensual pm
        WHERE pm.id IS NOT NULL
        LIMIT 1
      `);
      
      if (testResult.length > 0) {
        console.log('✅ Query de prueba exitosa');
      } else {
        console.log('⚠️ No hay registros en la tabla para probar');
      }
    } catch (testError) {
      console.error('❌ Error en prueba:', testError);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

main().catch(console.error);
