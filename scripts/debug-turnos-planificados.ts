#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function debugTurnosPlanificados() {
  console.log('🐛 DEBUGGEANDO TURNOS PLANIFICADOS\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    const [anioActual, mesActual, diaActual] = fechaActual.split('-').map(Number);
    
    console.log(`📅 Fecha: ${fechaActual} (${anioActual}/${mesActual}/${diaActual})`);

    // 1. Verificar TODOS los turnos sin filtros
    console.log('1️⃣ Verificar TODOS los turnos sin filtros...');
    
    const todosTurnos = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      ORDER BY i.nombre, po.nombre_puesto
    `, [anioActual, mesActual, diaActual]);

    console.log(`📊 Todos los turnos: ${todosTurnos.rows.length}`);
    todosTurnos.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado}) - Puesto: ${row.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 2. Verificar turnos por estado
    console.log('\n2️⃣ Verificar turnos por estado...');
    
    const turnosPorEstado = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      GROUP BY pm.estado
      ORDER BY pm.estado
    `, [anioActual, mesActual, diaActual]);

    console.log('📊 Turnos por estado:');
    turnosPorEstado.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} turnos`);
    });

    // 3. Verificar turnos planificados específicamente
    console.log('\n3️⃣ Verificar turnos planificados específicamente...');
    
    const turnosPlanificados = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.estado,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
      ORDER BY i.nombre, po.nombre_puesto
    `, [anioActual, mesActual, diaActual]);

    console.log(`📊 Turnos planificados: ${turnosPlanificados.rows.length}`);
    turnosPlanificados.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado}) - Puesto: ${row.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 4. Verificar instalaciones únicas con turnos planificados
    console.log('\n4️⃣ Verificar instalaciones únicas con turnos planificados...');
    
    const instalacionesUnicas = await query(`
      SELECT DISTINCT 
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
      GROUP BY pm.instalacion_id, i.nombre
      ORDER BY i.nombre
    `, [anioActual, mesActual, diaActual]);

    console.log(`📊 Instalaciones únicas con turnos planificados: ${instalacionesUnicas.rows.length}`);
    instalacionesUnicas.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 5. Verificar si hay algún problema con los datos
    console.log('\n5️⃣ Verificar si hay algún problema con los datos...');
    
    // Verificar si hay turnos con estados diferentes
    const estadosDiferentes = await query(`
      SELECT DISTINCT pm.estado
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      ORDER BY pm.estado
    `, [anioActual, mesActual, diaActual]);

    console.log('📊 Estados encontrados:');
    estadosDiferentes.rows.forEach((row: any) => {
      console.log(`   - "${row.estado}"`);
    });

    // 6. Verificar si hay algún problema con la fecha
    console.log('\n6️⃣ Verificar si hay algún problema con la fecha...');
    
    // Verificar turnos para diferentes fechas
    const turnosDiferentesFechas = await query(`
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
      LIMIT 20
    `);

    console.log('📊 Turnos para diferentes fechas de agosto:');
    turnosDiferentesFechas.rows.forEach((row: any) => {
      console.log(`   - ${row.anio}-${row.mes}-${row.dia}: ${row.estado} (${row.cantidad})`);
    });

    // 7. Verificar si hay turnos para el 30 específicamente
    console.log('\n7️⃣ Verificar turnos para el 30 específicamente...');
    
    const turnos30 = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        i.nombre as instalacion_nombre,
        po.nombre_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Turnos para el 30 de agosto: ${turnos30.rows.length}`);
    turnos30.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado})`);
    });

    console.log('\n🎯 DEBUG COMPLETADO:');
    console.log('==========================');
    console.log(`✅ Total turnos para ${fechaActual}: ${todosTurnos.rows.length}`);
    console.log(`✅ Turnos planificados: ${turnosPlanificados.rows.length}`);
    console.log(`✅ Instalaciones únicas: ${instalacionesUnicas.rows.length}`);
    console.log(`✅ Estados encontrados: ${estadosDiferentes.rows.length}`);

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

debugTurnosPlanificados();
