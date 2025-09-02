#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function diagnosticarCentralMonitoreo() {
  console.log('🔍 DIAGNÓSTICO CENTRAL DE MONITOREO - KPIs\n');

  try {
    const fecha = '2025-09-01';
    const tz = 'America/Santiago';
    
    console.log(`📅 Fecha de análisis: ${fecha}`);
    console.log(`🌍 Zona horaria: ${tz}\n`);

    // 1. Verificar datos en la vista automática
    console.log('1️⃣ Datos en vista automática:');
    const datosVista = await query(`
      SELECT 
        instalacion_nombre,
        programado_para,
        estado_llamado,
        es_urgente,
        es_actual,
        es_proximo,
        -- Calcular manualmente los flags para comparar
        CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) = $1
           AND date_trunc('hour', ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) = date_trunc('hour', (now() AT TIME ZONE $2))
          THEN true 
          ELSE false
        END as es_actual_manual,
        CASE 
          WHEN (DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) = $1 AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2) > (now() AT TIME ZONE $2))
           OR DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) > $1
          THEN true 
          ELSE false
        END as es_proximo_manual,
        CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) = $1
           AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2) < (now() AT TIME ZONE $2) - interval '30 minutes'
          THEN true 
          ELSE false
        END as es_urgente_manual
      FROM central_v_llamados_automaticos
      WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE $2)) >= $1
      ORDER BY programado_para
    `, [fecha, tz]);

    console.log(`📊 Total de llamados: ${datosVista.rows.length}`);
    
    if (datosVista.rows.length > 0) {
      console.log('\n📋 Detalle de llamados:');
      datosVista.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.instalacion_nombre}`);
        console.log(`      Programado: ${row.programado_para}`);
        console.log(`      Estado: ${row.estado_llamado}`);
        console.log(`      Vista: Actual=${row.es_actual}, Próximo=${row.es_proximo}, Urgente=${row.es_urgente}`);
        console.log(`      Manual: Actual=${row.es_actual_manual}, Próximo=${row.es_proximo_manual}, Urgente=${row.es_urgente_manual}`);
        console.log('');
      });
    }

    // 2. Verificar hora actual del sistema
    console.log('2️⃣ Hora actual del sistema:');
    const horaActual = await query(`
      SELECT 
        NOW() as hora_utc,
        NOW() AT TIME ZONE $1 as hora_local,
        EXTRACT(HOUR FROM NOW() AT TIME ZONE $1) as hora_actual
    `, [tz]);
    
    console.log(`   UTC: ${horaActual.rows[0].hora_utc}`);
    console.log(`   Local (${tz}): ${horaActual.rows[0].hora_local}`);
    console.log(`   Hora actual: ${horaActual.rows[0].hora_actual}:00\n`);

    // 3. Verificar configuración de instalaciones
    console.log('3️⃣ Configuración de instalaciones:');
    const configInstalaciones = await query(`
      SELECT 
        i.nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
      ORDER BY i.nombre
    `);

    console.log(`📊 Instalaciones con monitoreo habilitado: ${configInstalaciones.rows.length}`);
    configInstalaciones.rows.forEach((row: any) => {
      console.log(`   - ${row.nombre}: ${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}`);
    });

    // 4. Resumen del problema
    console.log('\n📋 RESUMEN DEL PROBLEMA:');
    
    const llamadosActuales = datosVista.rows.filter((row: any) => row.es_actual_manual);
    const llamadosProximos = datosVista.rows.filter((row: any) => row.es_proximo_manual);
    const llamadosUrgentes = datosVista.rows.filter((row: any) => row.es_urgente_manual);
    
    console.log(`   Total llamados: ${datosVista.rows.length}`);
    console.log(`   Actuales (manual): ${llamadosActuales.length}`);
    console.log(`   Próximos (manual): ${llamadosProximos.length}`);
    console.log(`   Urgentes (manual): ${llamadosUrgentes.length}`);
    
    if (datosVista.rows.length > 0 && llamadosActuales.length === 0 && llamadosProximos.length === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('   Todos los llamados están siendo marcados como "atrasados" en lugar de "actuales" o "próximos"');
      console.log('   Esto sugiere un problema con la lógica de clasificación en la vista automática');
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

diagnosticarCentralMonitoreo();
