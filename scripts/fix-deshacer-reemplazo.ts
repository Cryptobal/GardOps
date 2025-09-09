#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function fixDeshacerReemplazo() {
  console.log('🔧 Corrigiendo botón deshacer para REEMPLAZOS\n');
  
  try {
    // 1. Verificar si fn_registrar_reemplazo existe
    console.log('1️⃣ Verificando función fn_registrar_reemplazo...');
    const fnExists = await query(`
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'as_turnos' AND p.proname = 'fn_registrar_reemplazo'
    `);
    
    if (fnExists.rows.length === 0) {
      console.log('  ⚠️ Función fn_registrar_reemplazo no existe, creándola...');
      
      await query(`
        CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
            p_pauta_id bigint,
            p_cobertura_guardia_id uuid,
            p_actor_ref text,
            p_motivo text DEFAULT NULL
        )
        RETURNS TABLE (
            ok boolean,
            pauta_id bigint,
            estado text
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Actualizar la pauta con reemplazo
            UPDATE public.as_turnos_pauta_mensual
            SET 
                estado = 'trabajado',
                estado_ui = 'reemplazo',  -- IMPORTANTE: establecer como reemplazo
                meta = COALESCE(meta, '{}'::jsonb) || 
                       jsonb_build_object(
                           'cobertura_guardia_id', p_cobertura_guardia_id::text,
                           'estado_ui', 'reemplazo',
                           'motivo', p_motivo,
                           'marcado_por', p_actor_ref,
                           'marcado_ts', NOW()::text,
                           'action', 'registrar_reemplazo'
                       ),
                updated_at = NOW()
            WHERE id = p_pauta_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT 
                    FALSE,
                    p_pauta_id,
                    'error: Pauta no encontrada'::TEXT;
                RETURN;
            END IF;
            
            RETURN QUERY SELECT 
                TRUE,
                p_pauta_id,
                'reemplazo'::TEXT;
        END;
        $$
      `);
      
      console.log('  ✅ Función fn_registrar_reemplazo creada');
    } else {
      console.log('  ✅ Función fn_registrar_reemplazo ya existe');
      
      // Actualizar la función para asegurar que establece estado_ui = 'reemplazo'
      console.log('  Actualizando función para asegurar estado_ui correcto...');
      
      await query('DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text)');
      
      await query(`
        CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
            p_pauta_id bigint,
            p_cobertura_guardia_id uuid,
            p_actor_ref text,
            p_motivo text DEFAULT NULL
        )
        RETURNS TABLE (
            ok boolean,
            pauta_id bigint,
            estado text
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Actualizar la pauta con reemplazo
            UPDATE public.as_turnos_pauta_mensual
            SET 
                estado = 'trabajado',
                estado_ui = 'reemplazo',  -- IMPORTANTE: establecer como reemplazo
                meta = COALESCE(meta, '{}'::jsonb) || 
                       jsonb_build_object(
                           'cobertura_guardia_id', p_cobertura_guardia_id::text,
                           'estado_ui', 'reemplazo',
                           'motivo', p_motivo,
                           'marcado_por', p_actor_ref,
                           'marcado_ts', NOW()::text,
                           'action', 'registrar_reemplazo'
                       ),
                updated_at = NOW()
            WHERE id = p_pauta_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT 
                    FALSE,
                    p_pauta_id,
                    'error: Pauta no encontrada'::TEXT;
                RETURN;
            END IF;
            
            RETURN QUERY SELECT 
                TRUE,
                p_pauta_id,
                'reemplazo'::TEXT;
        END;
        $$
      `);
      
      console.log('  ✅ Función actualizada');
    }
    
    // 2. Verificar que fn_deshacer maneje correctamente el estado reemplazo
    console.log('\n2️⃣ Verificando que fn_deshacer maneje reemplazos...');
    
    const fnDeshacerDef = await query(`
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'as_turnos' AND p.proname = 'fn_deshacer'
      LIMIT 1
    `);
    
    if (fnDeshacerDef.rows.length > 0) {
      const def = fnDeshacerDef.rows[0].definition;
      if (def.includes("'reemplazo'")) {
        console.log('  ✅ fn_deshacer maneja el estado reemplazo');
      } else {
        console.log('  ⚠️ fn_deshacer podría no manejar correctamente reemplazos');
      }
    }
    
    // 3. Verificar registros con estado reemplazo
    console.log('\n3️⃣ Verificando registros con estado reemplazo...');
    
    const reemplazos = await query(`
      SELECT 
        id,
        estado,
        estado_ui,
        meta->>'cobertura_guardia_id' as cobertura_guardia_id,
        meta->>'estado_ui' as meta_estado_ui
      FROM as_turnos_pauta_mensual
      WHERE estado_ui = 'reemplazo'
         OR (meta->>'estado_ui' = 'reemplazo' AND estado_ui != 'reemplazo')
      LIMIT 5
    `);
    
    if (reemplazos.rows.length > 0) {
      console.log(`  Encontrados ${reemplazos.rows.length} registros:`);
      reemplazos.rows.forEach((r: any) => {
        console.log(`\n  ID ${r.id}:`);
        console.log(`    Estado: ${r.estado}`);
        console.log(`    Estado UI: ${r.estado_ui}`);
        console.log(`    Cobertura: ${r.cobertura_guardia_id}`);
        
        if (r.meta_estado_ui === 'reemplazo' && r.estado_ui !== 'reemplazo') {
          console.log(`    ⚠️ Inconsistencia: meta dice reemplazo pero estado_ui = ${r.estado_ui}`);
        }
      });
      
      // Corregir inconsistencias
      const fixInconsistencias = await query(`
        UPDATE as_turnos_pauta_mensual
        SET estado_ui = 'reemplazo'
        WHERE meta->>'estado_ui' = 'reemplazo'
          AND estado_ui != 'reemplazo'
        RETURNING id
      `);
      
      if (fixInconsistencias.rows.length > 0) {
        console.log(`\n  ✅ Corregidas ${fixInconsistencias.rows.length} inconsistencias`);
      }
    } else {
      console.log('  No hay registros con estado reemplazo actualmente');
    }
    
    // 4. Recordatorio importante
    console.log('\n4️⃣ Recordatorio importante:');
    console.log('  En ClientTable.tsx, canUndo incluye "reemplazo"');
    console.log('  El botón deshacer DEBE mostrarse para estado_ui = "reemplazo"');
    console.log('  Si marca un reemplazo y no ve el botón deshacer:');
    console.log('    1. Verifique que estado_ui sea "reemplazo" en la BD');
    console.log('    2. Refresque la página con Ctrl+F5');
    
    console.log('\n✅ Corrección completada');
    console.log('📝 Resumen:');
    console.log('  - Función fn_registrar_reemplazo creada/actualizada');
    console.log('  - Asegura que estado_ui = "reemplazo" al marcar reemplazo');
    console.log('  - Corregidas inconsistencias existentes');
    console.log('  - El botón deshacer debería funcionar para reemplazos');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixDeshacerReemplazo();
