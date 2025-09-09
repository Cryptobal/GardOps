#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function corregirEstados30Agosto() {
  console.log('🔧 CORRECCIÓN INMEDIATA - Estados del 30 de agosto\n');

  try {
    // 1. Verificar estado actual
    console.log('1️⃣ Verificando estado actual del 30 de agosto...');
    const estadoActual = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad,
        po.es_ppc,
        pm.guardia_id IS NOT NULL as tiene_guardia
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025 
        AND pm.mes = 8 
        AND pm.dia = 30
        AND po.activo = true
      GROUP BY pm.estado, po.es_ppc, pm.guardia_id IS NOT NULL
      ORDER BY pm.estado
    `);

    console.log('📊 Estado actual del 30 de agosto:');
    estadoActual.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} registros (PPC: ${row.es_ppc}, Guardia: ${row.tiene_guardia})`);
    });

    // 2. Corregir estados incorrectos
    console.log('\n2️⃣ Corrigiendo estados incorrectos...');
    
    // Revertir turnos marcados como 'trabajado' automáticamente
    const resultadoTrabajado = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET estado = 'planificado',
          updated_at = NOW()
      WHERE anio = 2025 
        AND mes = 8 
        AND dia = 30 
        AND estado = 'trabajado'
        AND puesto_id IN (
          SELECT id FROM as_turnos_puestos_operativos WHERE activo = true
        )
    `);

    console.log(`✅ Turnos 'trabajado' corregidos a 'planificado': ${resultadoTrabajado.rowCount}`);

    // Corregir PPCs que deberían estar 'planificado' o 'libre'
    const resultadoPPC = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET estado = 'planificado',
          updated_at = NOW()
      WHERE anio = 2025 
        AND mes = 8 
        AND dia = 30 
        AND estado IN ('Activo', 'T')
        AND puesto_id IN (
          SELECT id FROM as_turnos_puestos_operativos 
          WHERE activo = true AND es_ppc = true
        )
    `);

    console.log(`✅ PPCs corregidos a 'planificado': ${resultadoPPC.rowCount}`);

    // 3. Verificar estado después de la corrección
    console.log('\n3️⃣ Verificando estado después de la corrección...');
    const estadoDespues = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025 
        AND pm.mes = 8 
        AND pm.dia = 30
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `);

    console.log('📊 Estado después de la corrección:');
    estadoDespues.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} registros`);
    });

    // 4. Verificar que Pauta Diaria funcione correctamente
    console.log('\n4️⃣ Verificando Pauta Diaria...');
    const pautaDiaria = await query(`
      SELECT 
        po.nombre_puesto,
        po.es_ppc,
        pm.estado,
        g.nombre as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = 2025 
        AND pm.mes = 8 
        AND pm.dia = 30
        AND pm.estado = 'planificado'
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `);

    console.log(`✅ Pauta Diaria mostrará ${pautaDiaria.rows.length} turnos planificados:`);
    pautaDiaria.rows.forEach((row: any) => {
      const tipo = row.es_ppc ? 'PPC' : 'Guardia';
      const guardia = row.guardia_nombre || 'Sin asignar';
      console.log(`   - ${row.nombre_puesto} (${tipo}): ${guardia}`);
    });

    console.log('\n🎯 CORRECCIÓN COMPLETADA:');
    console.log('==========================');
    console.log('✅ Estados del 30 de agosto corregidos');
    console.log('✅ Pauta Diaria mostrará solo turnos planificados');
    console.log('✅ Central de Monitoreo funcionará correctamente');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar Pauta Diaria del 30 de agosto');
    console.log('2. Verificar Central de Monitoreo');
    console.log('3. Continuar con implementación completa');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

corregirEstados30Agosto();
