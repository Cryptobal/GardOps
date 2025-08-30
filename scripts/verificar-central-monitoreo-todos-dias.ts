#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function verificarCentralMonitoreoTodosDias() {
  console.log('🔍 VERIFICANDO CENTRAL DE MONITOREO PARA TODOS LOS DÍAS\n');

  try {
    // 1. Verificar turnos planificados para el día actual
    const fechaActual = new Date().toISOString().split('T')[0];
    const [anioActual, mesActual, diaActual] = fechaActual.split('-').map(Number);
    
    console.log(`📅 Verificando fecha actual: ${fechaActual}`);

    const turnosActuales = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `, [anioActual, mesActual, diaActual]);

    console.log('📊 Turnos para el día actual:');
    turnosActuales.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} turnos`);
    });

    // 2. Verificar instalaciones con turnos planificados hoy
    const instalacionesHoy = await query(`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
      GROUP BY i.nombre
      ORDER BY i.nombre
    `, [anioActual, mesActual, diaActual]);

    console.log(`\n📋 Instalaciones con turnos planificados hoy: ${instalacionesHoy.rows.length}`);
    instalacionesHoy.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 3. Verificar configuración de monitoreo
    const configuracionMonitoreo = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      ORDER BY i.nombre
    `);

    console.log(`\n📋 Configuración de monitoreo: ${configuracionMonitoreo.rows.length} instalaciones`);
    configuracionMonitoreo.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? '✅ HABILITADO' : '❌ NO HABILITADO';
      const config = `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}`;
      console.log(`   - ${row.instalacion_nombre}: ${habilitado} (${config})`);
    });

    // 4. Verificar llamados automáticos para hoy
    const llamadosHoy = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
    `, [fechaActual]);

    const stats = llamadosHoy.rows[0];
    console.log(`\n📊 Llamados automáticos para hoy: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 5. Verificar paso a paso por qué no hay llamados
    console.log('\n🔍 INVESTIGANDO POR QUÉ NO HAY LLAMADOS:');
    
    // Paso 1: Turnos planificados con configuración
    const turnosConConfig = await query(`
      SELECT 
        pm.id as pauta_id,
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
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
        AND po.activo = true
      ORDER BY i.nombre
    `, [anioActual, mesActual, diaActual]);

    console.log(`\n📋 Turnos planificados con configuración: ${turnosConConfig.rows.length}`);
    turnosConConfig.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${row.estado} - Config: ${habilitado} (${config})`);
    });

    // 6. Verificar qué filtros están fallando en la vista
    console.log('\n🔍 VERIFICANDO FILTROS DE LA VISTA:');
    
    // Sin filtro de configuración
    const sinFiltroConfig = await query(`
      SELECT 
        pm.id as pauta_id,
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
    `, [anioActual, mesActual, diaActual]);

    console.log(`📊 Sin filtro de configuración: ${sinFiltroConfig.rows.length}`);
    sinFiltroConfig.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${row.estado} - Config: ${habilitado} (${config})`);
    });

    // 7. Verificar instalaciones que necesitan configuración
    const instalacionesSinConfig = sinFiltroConfig.rows.filter((row: any) => !row.habilitado || !row.intervalo_minutos);
    
    if (instalacionesSinConfig.length > 0) {
      console.log('\n⚠️ INSTALACIONES QUE NECESITAN CONFIGURACIÓN:');
      instalacionesSinConfig.forEach((row: any) => {
        const problema = !row.habilitado ? 'NO HABILITADO' : 'SIN INTERVALO';
        console.log(`   - ${row.instalacion_nombre}: ${problema}`);
      });
    }

    // 8. Resumen y recomendaciones
    console.log('\n📋 ANÁLISIS COMPLETO:');
    console.log('==========================');
    
    if (instalacionesHoy.rows.length === 0) {
      console.log('❌ PROBLEMA: No hay instalaciones con turnos planificados hoy');
    } else if (stats.total_llamados === 0) {
      console.log('❌ PROBLEMA: Hay turnos planificados pero no se generan llamados automáticos');
      
      if (instalacionesSinConfig.length > 0) {
        console.log(`   🔧 CAUSA: ${instalacionesSinConfig.length} instalaciones sin configuración completa`);
      } else {
        console.log('   🔧 CAUSA: Problema en la lógica de la vista automática');
      }
    } else {
      console.log('✅ Central de Monitoreo funcionando correctamente');
    }

    console.log('\n🔧 RECOMENDACIONES:');
    if (instalacionesSinConfig.length > 0) {
      console.log('1. Configurar monitoreo para las instalaciones que no lo tienen');
      console.log('2. Habilitar monitoreo para todas las instalaciones con turnos planificados');
    }
    if (stats.total_llamados === 0 && instalacionesHoy.rows.length > 0) {
      console.log('3. Revisar la lógica de la vista automática');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

verificarCentralMonitoreoTodosDias();
