#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function investigarGuardiasFantasma() {
  console.log('🔍 INVESTIGANDO GUARDIAS FANTASMA EN PAUTA DIARIA\n');

  try {
    // Buscar los guardias específicos que aparecen en la imagen
    const guardias = [
      'Cayo Jaña, Evelyn del Carmen',
      'Oportus Zambrano, William Omar'
    ];

    console.log('1️⃣ Buscando guardias en la base de datos...');
    
    for (const nombreGuardia of guardias) {
      console.log(`\n🔍 Investigando: ${nombreGuardia}`);
      
      // Buscar el guardia por nombre
      const guardiaResult = await query(`
        SELECT id, nombre, apellido_paterno, apellido_materno,
               CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) as nombre_completo
        FROM guardias 
        WHERE CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) ILIKE $1
      `, [`%${nombreGuardia}%`]);
      
      if (guardiaResult.rows.length === 0) {
        console.log(`❌ Guardia no encontrado: ${nombreGuardia}`);
        continue;
      }
      
      const guardia = guardiaResult.rows[0];
      console.log(`✅ Guardia encontrado:`, {
        id: guardia.id,
        nombre_completo: guardia.nombre_completo
      });
      
      // Verificar asignaciones activas en as_turnos_puestos_operativos
      console.log(`\n2️⃣ Verificando asignaciones activas en puestos operativos...`);
      const puestosActivos = await query(`
        SELECT po.id, po.nombre_puesto, po.guardia_id, po.es_ppc, po.instalacion_id,
               i.nombre as instalacion_nombre
        FROM as_turnos_puestos_operativos po
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.guardia_id = $1 AND po.activo = true
      `, [guardia.id]);
      
      console.log(`📊 Puestos activos encontrados: ${puestosActivos.rows.length}`);
      puestosActivos.rows.forEach((puesto: any) => {
        console.log(`  - ${puesto.instalacion_nombre} | ${puesto.nombre_puesto} | PPC: ${puesto.es_ppc} | Guardia: ${puesto.guardia_id ? 'SÍ' : 'NO'}`);
      });
      
      // Verificar registros en as_turnos_pauta_mensual para hoy
      console.log(`\n3️⃣ Verificando registros en pauta mensual para hoy (2025-09-10)...`);
      const pautaHoy = await query(`
        SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.estado, pm.estado_ui, pm.anio, pm.mes, pm.dia,
               po.nombre_puesto, i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE pm.guardia_id = $1 AND pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 10
      `, [guardia.id]);
      
      console.log(`📊 Registros en pauta mensual para hoy: ${pautaHoy.rows.length}`);
      pautaHoy.rows.forEach((registro: any) => {
        console.log(`  - ${registro.instalacion_nombre} | ${registro.nombre_puesto} | Estado: ${registro.estado} | Estado UI: ${registro.estado_ui}`);
      });
      
      // Verificar historial de asignaciones
      console.log(`\n4️⃣ Verificando historial de asignaciones...`);
      const historial = await query(`
        SELECT ha.id, ha.guardia_id, ha.puesto_operativo_id, ha.fecha_inicio, ha.fecha_termino,
               ha.estado, ha.motivo_inicio, ha.motivo_termino,
               po.nombre_puesto, i.nombre as instalacion_nombre
        FROM historial_asignaciones_guardias ha
        LEFT JOIN as_turnos_puestos_operativos po ON ha.puesto_operativo_id = po.id
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE ha.guardia_id = $1
        ORDER BY ha.fecha_inicio DESC
        LIMIT 5
      `, [guardia.id]);
      
      console.log(`📊 Últimas 5 asignaciones en historial: ${historial.rows.length}`);
      historial.rows.forEach((asignacion: any) => {
        console.log(`  - ${asignacion.instalacion_nombre} | ${asignacion.nombre_puesto} | ${asignacion.fecha_inicio} - ${asignacion.fecha_termino || 'ACTIVA'} | Estado: ${asignacion.estado}`);
      });
    }
    
    console.log('\n✅ Investigación completada');
    
  } catch (error) {
    console.error('❌ Error en investigación:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  investigarGuardiasFantasma()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { investigarGuardiasFantasma };
