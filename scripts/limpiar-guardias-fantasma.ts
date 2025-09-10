#!/usr/bin/env ts-node

import { query } from '../src/lib/database';
import { sincronizarPautasPostAsignacion } from '../src/lib/sync-pautas';

async function limpiarGuardiasFantasma() {
  console.log('🧹 LIMPIANDO GUARDIAS FANTASMA EN PAUTA DIARIA\n');

  try {
    // Buscar registros en as_turnos_pauta_mensual para hoy que tengan guardia_id
    // pero el guardia no esté asignado en as_turnos_puestos_operativos
    console.log('1️⃣ Buscando registros fantasma en as_turnos_pauta_mensual...');
    
    const registrosFantasma = await query(`
      SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.estado, pm.estado_ui, pm.anio, pm.mes, pm.dia,
             po.nombre_puesto, po.guardia_id as puesto_guardia_id, po.es_ppc,
             i.nombre as instalacion_nombre,
             CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 10
        AND pm.guardia_id IS NOT NULL
        AND (po.guardia_id IS NULL OR po.guardia_id != pm.guardia_id OR po.es_ppc = true)
    `);
    
    console.log(`📊 Registros fantasma encontrados: ${registrosFantasma.rows.length}`);
    
    if (registrosFantasma.rows.length === 0) {
      console.log('✅ No se encontraron registros fantasma');
      return;
    }
    
    // Mostrar los registros encontrados
    console.log('\n2️⃣ Registros fantasma detectados:');
    registrosFantasma.rows.forEach((registro: any, index: number) => {
      console.log(`  ${index + 1}. ${registro.guardia_nombre} en ${registro.instalacion_nombre} - ${registro.nombre_puesto}`);
      console.log(`     Estado: ${registro.estado} | Estado UI: ${registro.estado_ui}`);
      console.log(`     Puesto tiene guardia: ${registro.puesto_guardia_id ? 'SÍ' : 'NO'} | Es PPC: ${registro.es_ppc}`);
      console.log('');
    });
    
    // Limpiar los registros fantasma
    console.log('3️⃣ Limpiando registros fantasma...');
    
    for (const registro of registrosFantasma.rows) {
      console.log(`🧹 Limpiando: ${registro.guardia_nombre} en ${registro.instalacion_nombre}`);
      
      // Usar la función de sincronización para limpiar correctamente
      const resultadoSync = await sincronizarPautasPostAsignacion(
        registro.puesto_id,
        null, // guardiaId = null para desasignación
        registro.instalacion_nombre, // instalacionId (usar nombre como fallback)
        'unknown' // rolId (no crítico para limpieza)
      );
      
      if (resultadoSync.success) {
        console.log(`✅ Limpiado correctamente: ${registro.guardia_nombre}`);
      } else {
        console.log(`❌ Error limpiando: ${registro.guardia_nombre} - ${resultadoSync.error}`);
      }
    }
    
    console.log('\n✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarGuardiasFantasma()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { limpiarGuardiasFantasma };
