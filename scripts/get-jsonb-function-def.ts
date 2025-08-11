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

    // Obtener la definición completa de la versión con jsonb
    const { rows: jsonbFunc } = await client.query(`
      SELECT 
        pg_get_functiondef(oid) as full_definition
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
      AND proargtypes[2] = 'jsonb'::regtype
    `);

    if (jsonbFunc.length > 0) {
      console.log('\n📄 Definición de fn_marcar_asistencia(bigint,text,jsonb,text):');
      console.log(jsonbFunc[0].full_definition);
      console.log('\n' + '='.repeat(80));
    }

    // Ahora voy a eliminar la versión problemática y recrearla correctamente
    console.log('\n🔧 Corrigiendo la función...');
    
    // Primero eliminar la versión con jsonb
    await client.query(`
      DROP FUNCTION IF EXISTS as_turnos.fn_marcar_asistencia(bigint,text,jsonb,text);
    `);
    console.log('✅ Función anterior eliminada');

    // Recrear con el retorno correcto
    await client.query(`
      CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
        p_pauta_id bigint,
        p_estado text,
        p_meta jsonb,
        p_actor_ref text
      )
      RETURNS TABLE(id bigint)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_before jsonb;
        v_after  jsonb;
        v_norm   text;
        v_estado_ui text;
      BEGIN
        -- Extraer estado_ui del meta si existe
        v_estado_ui := p_meta->>'estado_ui';
        
        -- Normaliza el estado
        v_norm := CASE
                    WHEN lower(p_estado) IN ('trabajado', 'asistio', 't') THEN 'trabajado'
                    WHEN lower(p_estado) IN ('inasistencia', 'no_asistio') THEN 'inasistencia'
                    WHEN lower(p_estado) IN ('reemplazo') THEN 'reemplazo'
                    ELSE p_estado
                  END;

        -- Snapshot ANTES (bloqueando la fila)
        SELECT to_jsonb(pm.*) INTO v_before
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
                        'action', p_estado
                      ),
               estado_ui = COALESCE(v_estado_ui, pm.estado_ui),
               updated_at = NOW()
         WHERE pm.id = p_pauta_id;

        -- Snapshot DESPUÉS
        SELECT to_jsonb(pm.*) INTO v_after
        FROM public.as_turnos_pauta_mensual pm
        WHERE pm.id = p_pauta_id;

        -- LOG (si la tabla existe)
        BEGIN
          INSERT INTO public.as_turnos_logs(actor_ref, action, pauta_id, before_state, after_state)
          VALUES (p_actor_ref, p_estado, p_pauta_id, v_before, v_after);
        EXCEPTION WHEN undefined_table THEN
          -- La tabla de logs no existe, continuar sin logging
          NULL;
        END;

        -- RETURN el ID
        RETURN QUERY SELECT p_pauta_id;
      END;
      $$;
    `);
    
    console.log('✅ Función recreada correctamente con retorno TABLE(id bigint)');

    // Verificar que funciona
    console.log('\n🧪 Verificando la función corregida...');
    const { rows: allFuncs } = await client.query(`
      SELECT 
        oid::regprocedure as signature,
        prorettype::regtype as return_type
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
      ORDER BY oid
    `);

    console.log('\n📋 Funciones disponibles ahora:');
    allFuncs.forEach(f => {
      console.log(`  - ${f.signature} => ${f.return_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
