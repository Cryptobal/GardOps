#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function crearTurnos30Agosto() {
  console.log('🔧 CREANDO TURNOS FALTANTES DEL 30 DE AGOSTO\n');

  try {
    // 1. Verificar qué días tienen datos
    console.log('1️⃣ Verificando días con datos...');
    
    const diasConDatos = await query(`
      SELECT 
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = 2025 AND pm.mes = 8
      GROUP BY pm.anio, pm.mes, pm.dia, pm.estado
      ORDER BY pm.dia, pm.estado
    `);

    console.log('📊 Días con datos en agosto:');
    const diasUnicos = new Set();
    diasConDatos.rows.forEach((row: any) => {
      diasUnicos.add(row.dia);
      console.log(`   - ${row.anio}-${row.mes}-${row.dia}: ${row.estado} (${row.cantidad})`);
    });

    console.log(`\n📋 Días únicos con datos: ${Array.from(diasUnicos).sort((a: any, b: any) => a - b).join(', ')}`);

    // 2. Obtener un día de referencia para copiar la estructura
    const diaReferencia = Array.from(diasUnicos).sort((a: any, b: any) => a - b)[0];
    console.log(`\n2️⃣ Usando día ${diaReferencia} como referencia...`);

    // 3. Obtener todos los puestos operativos activos
    console.log('\n3️⃣ Obteniendo puestos operativos activos...');
    
    const puestosActivos = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.instalacion_id,
        po.guardia_id,
        po.rol_id,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.activo = true
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Puestos activos encontrados: ${puestosActivos.rows.length}`);
    puestosActivos.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto}`);
    });

    // 4. Obtener el patrón de turnos del día de referencia
    console.log(`\n4️⃣ Obteniendo patrón de turnos del día ${diaReferencia}...`);
    
    const patronReferencia = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.estado_ui,
        pm.observaciones,
        pm.meta
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = $1
      ORDER BY pm.puesto_id
    `, [diaReferencia]);

    console.log(`📊 Patrón de referencia: ${patronReferencia.rows.length} turnos`);
    
    // Crear mapa de estados por puesto
    const estadosPorPuesto = new Map();
    patronReferencia.rows.forEach((row: any) => {
      estadosPorPuesto.set(row.puesto_id, {
        estado: row.estado,
        estado_ui: row.estado_ui,
        observaciones: row.observaciones,
        meta: row.meta
      });
    });

    // 5. Crear turnos para el día 30
    console.log('\n5️⃣ Creando turnos para el día 30...');
    
    let creados = 0;
    for (const puesto of puestosActivos.rows) {
      const estadoReferencia = estadosPorPuesto.get(puesto.puesto_id);
      
      if (estadoReferencia) {
        await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id,
            guardia_id,
            anio,
            mes,
            dia,
            estado,
            estado_ui,
            observaciones,
            meta,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia) DO NOTHING
        `, [
          puesto.puesto_id,
          puesto.guardia_id,
          2025, // anio
          8,    // mes
          30,   // dia
          estadoReferencia.estado,
          estadoReferencia.estado_ui,
          estadoReferencia.observaciones,
          estadoReferencia.meta
        ]);

        console.log(`   ✅ Creado: ${puesto.instalacion_nombre} - ${puesto.nombre_puesto} (${estadoReferencia.estado})`);
        creados++;
      } else {
        // Si no hay referencia, crear como planificado por defecto
        await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id,
            guardia_id,
            anio,
            mes,
            dia,
            estado,
            estado_ui,
            observaciones,
            meta,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia) DO NOTHING
        `, [
          puesto.puesto_id,
          puesto.guardia_id,
          2025, // anio
          8,    // mes
          30,   // dia
          'planificado',
          'plan',
          null,
          null
        ]);

        console.log(`   ✅ Creado por defecto: ${puesto.instalacion_nombre} - ${puesto.nombre_puesto} (planificado)`);
        creados++;
      }
    }

    // 6. Verificar que se crearon correctamente
    console.log('\n6️⃣ Verificando turnos creados...');
    
    const turnosCreados = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
      GROUP BY pm.estado
      ORDER BY pm.estado
    `);

    console.log('📊 Turnos creados para el 30 de agosto:');
    turnosCreados.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} turnos`);
    });

    // 7. Verificar instalaciones con turnos planificados
    console.log('\n7️⃣ Verificando instalaciones con turnos planificados...');
    
    const instalacionesPlanificadas = await query(`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      GROUP BY i.nombre
      ORDER BY i.nombre
    `);

    console.log(`📊 Instalaciones con turnos planificados: ${instalacionesPlanificadas.rows.length}`);
    instalacionesPlanificadas.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 8. Verificar llamados automáticos
    console.log('\n8️⃣ Verificando llamados automáticos...');
    
    const llamadosAutomaticos = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = '2025-08-30'
    `);

    const stats = llamadosAutomaticos.rows[0];
    console.log(`📊 Llamados automáticos para el 30 de agosto: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    console.log('\n🎯 CREACIÓN COMPLETADA:');
    console.log('==========================');
    console.log(`✅ Turnos creados: ${creados}`);
    console.log(`✅ Instalaciones con turnos planificados: ${instalacionesPlanificadas.rows.length}`);
    console.log(`✅ Llamados automáticos generados: ${stats.total_llamados}`);
    console.log('✅ Central de Monitoreo ahora debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error durante la creación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

crearTurnos30Agosto();
