#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function investigarProblemaCentral() {
  console.log('🔍 INVESTIGANDO PROBLEMA CENTRAL DE MONITOREO\n');

  try {
    const fechaTest = '2025-08-30';
    const [anio, mes, dia] = fechaTest.split('-').map(Number);

    // 1. Verificar turnos planificados directamente
    console.log('1️⃣ Verificando turnos planificados directamente...');
    
    const turnosPlanificados = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.instalacion_id,
        pm.estado,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      ORDER BY i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Turnos encontrados: ${turnosPlanificados.rows.length}`);
    turnosPlanificados.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado}) - Puesto: ${row.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 2. Verificar instalaciones únicas con turnos planificados
    console.log('\n2️⃣ Verificando instalaciones únicas con turnos planificados...');
    
    const instalacionesUnicas = await query(`
      SELECT DISTINCT 
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as total_turnos
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
      GROUP BY pm.instalacion_id, i.nombre
      ORDER BY i.nombre
    `, [anio, mes, dia]);

    console.log(`📊 Instalaciones únicas: ${instalacionesUnicas.rows.length}`);
    instalacionesUnicas.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.total_turnos} turnos planificados`);
    });

    // 3. Verificar configuración de estas instalaciones
    console.log('\n3️⃣ Verificando configuración de instalaciones...');
    
    if (instalacionesUnicas.rows.length > 0) {
      const instalacionIds = instalacionesUnicas.rows.map((row: any) => row.instalacion_id);
      
      const configuracion = await query(`
        SELECT 
          cci.instalacion_id,
          i.nombre as instalacion_nombre,
          cci.habilitado,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin
        FROM central_config_instalacion cci
        INNER JOIN instalaciones i ON cci.instalacion_id = i.id
        WHERE cci.instalacion_id = ANY($1)
        ORDER BY i.nombre
      `, [instalacionIds]);

      console.log(`📊 Configuración encontrada: ${configuracion.rows.length}`);
      configuracion.rows.forEach((row: any) => {
        const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
        const config = row.intervalo_minutos ? 
          `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
          'SIN CONFIGURAR';
        console.log(`   - ${row.instalacion_nombre}: ${habilitado} (${config})`);
      });
    }

    // 4. Verificar qué pasa en la vista automática
    console.log('\n4️⃣ Verificando vista automática...');
    
    const vistaAutomatica = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
    `, [fechaTest]);

    const stats = vistaAutomatica.rows[0];
    console.log('📊 Vista automática:');
    console.log(`   - Total llamados: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 5. Verificar paso a paso la vista automática
    console.log('\n5️⃣ Verificando paso a paso la vista automática...');
    
    // Paso 1: turnos_activos
    const turnosActivos = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.instalacion_id,
        pm.guardia_id,
        pm.puesto_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        po.activo as puesto_activo,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'planificado'
        AND pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      ORDER BY i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Turnos activos en vista: ${turnosActivos.rows.length}`);
    turnosActivos.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado}) - Config: ${habilitado} (${config})`);
    });

    // 6. Verificar qué filtros están fallando
    console.log('\n6️⃣ Verificando filtros que fallan...');
    
    // Sin filtro de configuración
    const sinFiltroConfig = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        pm.estado,
        po.activo as puesto_activo,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'planificado'
        AND pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
      ORDER BY i.nombre
    `, [anio, mes, dia]);

    console.log(`📊 Sin filtro de configuración: ${sinFiltroConfig.rows.length}`);
    sinFiltroConfig.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${row.estado} - Config: ${habilitado} (${config})`);
    });

    // 7. Resumen del problema
    console.log('\n📋 ANÁLISIS DEL PROBLEMA:');
    console.log('==========================');
    
    if (turnosPlanificados.rows.length === 0) {
      console.log('❌ PROBLEMA: No hay turnos planificados para el 30 de agosto');
    } else if (instalacionesUnicas.rows.length === 0) {
      console.log('❌ PROBLEMA: No hay instalaciones con turnos planificados');
    } else if (configuracion.rows.length === 0) {
      console.log('❌ PROBLEMA: Las instalaciones no tienen configuración de monitoreo');
    } else if (turnosActivos.rows.length === 0) {
      console.log('❌ PROBLEMA: Los filtros de la vista automática están eliminando todos los registros');
    } else {
      console.log('✅ Los datos están correctos, el problema debe estar en otro lugar');
    }

    console.log('\n🔧 RECOMENDACIONES:');
    if (turnosPlanificados.rows.length > 0 && configuracion.rows.length === 0) {
      console.log('1. Crear configuración para las instalaciones que no la tienen');
    }
    if (turnosActivos.rows.length === 0 && sinFiltroConfig.rows.length > 0) {
      console.log('2. Revisar los filtros de la vista automática');
    }

  } catch (error) {
    console.error('❌ Error durante la investigación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

investigarProblemaCentral();
