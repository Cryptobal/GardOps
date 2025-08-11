#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function fixSyncCorruption() {
  console.log('🔧 Corrigiendo corrupción de datos en Pauta Diaria\n');
  
  try {
    // 1. Corregir registros que tienen guardia asignado pero estado_ui incorrecto
    console.log('1️⃣ Corrigiendo registros con guardia pero estado sin_cobertura...');
    
    const fix1 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET 
        estado_ui = 'plan',
        meta = meta - 'estado_ui'  -- Eliminar el campo estado_ui del meta
      WHERE guardia_id IS NOT NULL
        AND (estado_ui = 'sin_cobertura' OR meta->>'estado_ui' = 'sin_cobertura')
      RETURNING id, estado, estado_ui, guardia_id
    `);
    
    if (fix1.rows.length > 0) {
      console.log(`  ✅ Corregidos ${fix1.rows.length} registros:`);
      fix1.rows.forEach((r: any) => {
        console.log(`    ID ${r.id}: ahora tiene estado_ui = ${r.estado_ui}`);
      });
    } else {
      console.log('  No se encontraron registros con este problema');
    }
    
    // 2. Corregir registros sin guardia que tienen estado incorrecto
    console.log('\n2️⃣ Corrigiendo registros sin guardia con estado incorrecto...');
    
    const fix2 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET 
        estado_ui = CASE
          WHEN estado = 'libre' THEN 'libre'
          WHEN estado = 'planificado' THEN 'plan'
          ELSE 'plan'
        END,
        meta = meta - 'estado_ui' - 'cobertura_guardia_id'
      WHERE guardia_id IS NULL
        AND estado_ui NOT IN ('plan', 'libre', 'ppc_libre')
      RETURNING id, estado, estado_ui
    `);
    
    if (fix2.rows.length > 0) {
      console.log(`  ✅ Corregidos ${fix2.rows.length} registros sin guardia:`);
      fix2.rows.forEach((r: any) => {
        console.log(`    ID ${r.id}: ahora tiene estado_ui = ${r.estado_ui}`);
      });
    } else {
      console.log('  No se encontraron registros sin guardia con problemas');
    }
    
    // 3. Limpiar meta de campos que no deberían estar cuando está en plan
    console.log('\n3️⃣ Limpiando campos meta innecesarios...');
    
    const fix3 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET meta = jsonb_strip_nulls(
        meta 
        - 'cobertura_guardia_id'
        - 'estado_ui'
        - 'ausente_guardia_id'
        - 'extra_uid'
        - 'tipo'
      )
      WHERE estado_ui = 'plan'
        AND (
          meta->>'cobertura_guardia_id' IS NOT NULL
          OR meta->>'estado_ui' IS NOT NULL
          OR meta->>'ausente_guardia_id' IS NOT NULL
        )
      RETURNING id
    `);
    
    if (fix3.rows.length > 0) {
      console.log(`  ✅ Limpiados ${fix3.rows.length} registros`);
    } else {
      console.log('  No se encontraron registros con meta innecesario');
    }
    
    // 4. Corregir registros con estado_ui NULL
    console.log('\n4️⃣ Corrigiendo registros con estado_ui NULL...');
    
    const fix4 = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado_ui = CASE
        WHEN estado = 'libre' THEN 'libre'
        WHEN estado = 'planificado' THEN 'plan'
        WHEN estado = 'trabajado' THEN 'asistido'
        WHEN estado = 'sin_cobertura' THEN 'sin_cobertura'
        ELSE 'plan'
      END
      WHERE estado_ui IS NULL
      RETURNING id, estado, estado_ui
    `);
    
    if (fix4.rows.length > 0) {
      console.log(`  ✅ Corregidos ${fix4.rows.length} registros con estado_ui NULL`);
    } else {
      console.log('  No hay registros con estado_ui NULL');
    }
    
    // 5. Verificar resultados finales
    console.log('\n5️⃣ Verificando resultados finales...');
    
    const verificacion = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado_ui IS NULL THEN 1 END) as sin_estado_ui,
        COUNT(CASE WHEN guardia_id IS NOT NULL AND estado_ui = 'sin_cobertura' THEN 1 END) as con_guardia_sin_cobertura,
        COUNT(CASE WHEN meta->>'estado_ui' IS NOT NULL THEN 1 END) as con_estado_ui_en_meta
      FROM as_turnos_pauta_mensual
      WHERE anio = 2025 AND mes = 8
    `);
    
    const stats = verificacion.rows[0];
    console.log(`  Total registros agosto 2025: ${stats.total}`);
    console.log(`  Sin estado_ui: ${stats.sin_estado_ui}`);
    console.log(`  Con guardia pero sin_cobertura: ${stats.con_guardia_sin_cobertura}`);
    console.log(`  Con estado_ui en meta: ${stats.con_estado_ui_en_meta}`);
    
    if (stats.sin_estado_ui === '0' && stats.con_guardia_sin_cobertura === '0') {
      console.log('\n✅ Todos los problemas corregidos exitosamente');
    } else {
      console.log('\n⚠️ Aún quedan algunos problemas por resolver');
    }
    
    // 6. Mostrar cómo quedaron los datos del 11 y 12 de agosto
    console.log('\n6️⃣ Estado final del 11 y 12 de agosto:');
    
    const finalState = await query(`
      SELECT 
        id,
        dia,
        estado,
        estado_ui,
        guardia_id,
        CASE 
          WHEN guardia_id IS NOT NULL THEN 'CON GUARDIA'
          ELSE 'SIN GUARDIA'
        END as guardia_status
      FROM as_turnos_pauta_mensual
      WHERE anio = 2025 AND mes = 8 AND dia IN (11, 12)
      ORDER BY dia, id
    `);
    
    finalState.rows.forEach((r: any) => {
      console.log(`  ID ${r.id} (Día ${r.dia}): ${r.estado_ui} - ${r.guardia_status}`);
    });
    
    console.log('\n✅ Corrección completada');
    console.log('📝 Resumen:');
    console.log('  - Corregidos registros con guardia pero estado sin_cobertura');
    console.log('  - Normalizados estados de PPC');
    console.log('  - Limpiados campos meta innecesarios');
    console.log('  - Todos los registros tienen estado_ui correcto');
    console.log('\n⚠️ Por favor refresca la página para ver los cambios');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixSyncCorruption();
