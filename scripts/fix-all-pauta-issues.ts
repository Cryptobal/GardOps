#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function fixAllPautaIssues() {
  console.log('🔧 Corrigiendo TODOS los problemas de Pauta Diaria V2\n');
  
  try {
    // 1. Corregir inconsistencias de estado
    console.log('1️⃣ Corrigiendo inconsistencias de estado...');
    
    // Corregir registros que tienen cobertura_guardia_id pero estado 'sin_cobertura'
    const fix1 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado = 'trabajado'
      WHERE meta->>'cobertura_guardia_id' IS NOT NULL
        AND estado = 'sin_cobertura'
      RETURNING id, estado, estado_ui
    `);
    console.log(`  ✅ Corregidos ${fix1.rows.length} registros con cobertura pero estado sin_cobertura`);
    
    // Corregir registros PPC con estado_ui inconsistente
    const fix2 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado_ui = CASE
        WHEN meta->>'cobertura_guardia_id' IS NOT NULL THEN 'asistido'
        WHEN estado = 'sin_cobertura' THEN 'sin_cobertura'
        WHEN estado = 'planificado' AND meta->>'sin_cobertura' = 'true' THEN 'sin_cobertura'
        WHEN estado = 'planificado' THEN 'plan'
        WHEN estado = 'trabajado' THEN 'asistido'
        WHEN estado = 'libre' THEN 'libre'
        ELSE estado_ui
      END
      WHERE estado_ui IS NULL OR estado_ui = 'extra'
      RETURNING id, estado, estado_ui
    `);
    console.log(`  ✅ Corregidos ${fix2.rows.length} registros con estado_ui inconsistente`);
    
    // 2. Actualizar función fn_marcar_asistencia para PPC
    console.log('\n2️⃣ Actualizando función fn_marcar_asistencia...');
    
    // Buscar qué versiones existen
    const fnVersions = await query(`
      SELECT pg_get_function_arguments(p.oid) as args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'as_turnos' AND p.proname = 'fn_marcar_asistencia'
    `);
    
    console.log(`  Encontradas ${fnVersions.rows.length} versiones de fn_marcar_asistencia`);
    
    // Eliminar la versión existente si existe
    try {
      await query('DROP FUNCTION IF EXISTS as_turnos.fn_marcar_asistencia(bigint, text, jsonb, text)');
      console.log('  Función anterior eliminada');
    } catch (err) {
      // Ignorar si no existe
    }
    
    // Crear/actualizar la versión correcta
    await query(`
      CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
          p_pauta_id bigint,
          p_estado text,
          p_meta jsonb,
          p_actor_ref text
      )
      RETURNS TABLE (
          ok boolean,
          pauta_id bigint,
          estado text
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
          -- Actualizar la pauta
          UPDATE public.as_turnos_pauta_mensual
          SET 
              estado = COALESCE(p_estado, 'trabajado'),
              estado_ui = CASE
                WHEN p_meta->>'cobertura_guardia_id' IS NOT NULL THEN 'asistido'
                WHEN p_meta->>'estado_ui' = 'reemplazo' THEN 'reemplazo'
                WHEN p_estado = 'sin_cobertura' THEN 'sin_cobertura'
                ELSE 'asistido'
              END,
              meta = COALESCE(meta, '{}'::jsonb) || 
                     COALESCE(p_meta, '{}'::jsonb) || 
                     jsonb_build_object(
                         'marcado_por', p_actor_ref,
                         'marcado_ts', NOW()::text,
                         'action', 'marcar_asistencia'
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
          
          -- Devolver el estado final real
          RETURN QUERY 
          SELECT 
              TRUE,
              p_pauta_id,
              pm.estado_ui::TEXT
          FROM public.as_turnos_pauta_mensual pm
          WHERE pm.id = p_pauta_id;
      END;
      $$
    `);
    console.log('  ✅ Función fn_marcar_asistencia actualizada');
    
    // 3. Verificar resultados
    console.log('\n3️⃣ Verificando resultados...');
    
    const estadosFinales = await query(`
      SELECT 
        estado_ui, 
        COUNT(*) as count,
        COUNT(CASE WHEN es_ppc THEN 1 END) as ppc_count
      FROM as_turnos_v_pauta_diaria_dedup
      WHERE fecha::date = CURRENT_DATE
      GROUP BY estado_ui
      ORDER BY estado_ui
    `);
    
    console.log('  Estados finales para hoy:');
    estadosFinales.rows.forEach((e: any) => {
      console.log(`    ${e.estado_ui}: ${e.count} registros (${e.ppc_count} PPC)`);
    });
    
    // 4. Verificar que no hay más inconsistencias
    const inconsistencias = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual
      WHERE (meta->>'cobertura_guardia_id' IS NOT NULL AND estado = 'sin_cobertura')
         OR (estado_ui = 'extra')
         OR (estado = 'trabajado' AND estado_ui = 'sin_cobertura')
    `);
    
    if (inconsistencias.rows[0].count > 0) {
      console.log(`\n⚠️  Aún hay ${inconsistencias.rows[0].count} inconsistencias`);
    } else {
      console.log('\n✅ No hay más inconsistencias');
    }
    
    console.log('\n✅ Corrección completada');
    console.log('📝 Resumen:');
    console.log('  - Estados corregidos y normalizados');
    console.log('  - Función fn_marcar_asistencia actualizada');
    console.log('  - Ya no se creará el estado "extra"');
    console.log('  - Los botones deberían funcionar correctamente ahora');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixAllPautaIssues();
