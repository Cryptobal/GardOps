#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function verificarConsultaInstalaciones() {
  console.log('🔍 VERIFICANDO CONSULTA DE INSTALACIONES\n');

  try {
    // 1. Verificar turnos planificados directamente
    console.log('1️⃣ Verificar turnos planificados directamente...');
    
    const turnosPlanificados = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.estado,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Turnos planificados encontrados: ${turnosPlanificados.rows.length}`);
    turnosPlanificados.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado})`);
    });

    // 2. Verificar instalaciones únicas manualmente
    console.log('\n2️⃣ Verificar instalaciones únicas manualmente...');
    
    const instalacionesUnicas = new Set();
    turnosPlanificados.rows.forEach((row: any) => {
      instalacionesUnicas.add(row.instalacion_nombre);
    });

    console.log(`📊 Instalaciones únicas encontradas: ${instalacionesUnicas.size}`);
    Array.from(instalacionesUnicas).forEach((instalacion: any) => {
      console.log(`   - ${instalacion}`);
    });

    // 3. Verificar la consulta que no funciona
    console.log('\n3️⃣ Verificar la consulta que no funciona...');
    
    const consultaQueNoFunciona = await query(`
      SELECT DISTINCT 
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      GROUP BY pm.instalacion_id, i.nombre
      ORDER BY i.nombre
    `);

    console.log(`📊 Resultado de la consulta que no funciona: ${consultaQueNoFunciona.rows.length}`);
    consultaQueNoFunciona.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 4. Verificar si hay algún problema con los JOINs
    console.log('\n4️⃣ Verificar si hay algún problema con los JOINs...');
    
    // Sin JOIN con instalaciones
    const sinJoinInstalaciones = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.estado,
        pm.instalacion_id
      FROM as_turnos_pauta_mensual pm
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      ORDER BY pm.instalacion_id
    `);

    console.log(`📊 Sin JOIN con instalaciones: ${sinJoinInstalaciones.rows.length}`);
    sinJoinInstalaciones.rows.forEach((row: any) => {
      console.log(`   - Pauta ID: ${row.pauta_id}, Estado: ${row.estado}, Instalación ID: ${row.instalacion_id}`);
    });

    // 5. Verificar si las instalaciones existen
    console.log('\n5️⃣ Verificar si las instalaciones existen...');
    
    const instalacionesIds = sinJoinInstalaciones.rows.map((row: any) => row.instalacion_id);
    const instalacionesUnicasIds = Array.from(new Set(instalacionesIds));
    
    console.log(`📊 IDs de instalaciones únicas: ${instalacionesUnicasIds.join(', ')}`);
    
    for (const instalacionId of instalacionesUnicasIds) {
      const instalacion = await query(`
        SELECT id, nombre FROM instalaciones WHERE id = $1
      `, [instalacionId]);
      
      if (instalacion.rows.length > 0) {
        console.log(`   ✅ Instalación ${instalacionId}: ${instalacion.rows[0].nombre}`);
      } else {
        console.log(`   ❌ Instalación ${instalacionId}: NO EXISTE`);
      }
    }

    // 6. Verificar la vista automática
    console.log('\n6️⃣ Verificar la vista automática...');
    
    const vistaAutomatica = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = '2025-08-30'
    `);

    const stats = vistaAutomatica.rows[0];
    console.log(`📊 Vista automática para el 30 de agosto: ${stats.total_llamados} llamados`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 7. Verificar el CTE turnos_activos de la vista
    console.log('\n7️⃣ Verificar el CTE turnos_activos de la vista...');
    
    const turnosActivos = await query(`
      WITH turnos_activos AS (
        SELECT
          pm.id as pauta_id,
          pm.estado,
          pm.instalacion_id,
          i.nombre as instalacion_nombre,
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
          AND pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
      )
      SELECT * FROM turnos_activos
      ORDER BY instalacion_nombre
    `);

    console.log(`📊 CTE turnos_activos: ${turnosActivos.rows.length} turnos`);
    turnosActivos.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${row.estado} - Config: ${habilitado} (${config})`);
    });

    console.log('\n🎯 VERIFICACIÓN COMPLETADA:');
    console.log('=============================');
    console.log(`✅ Turnos planificados: ${turnosPlanificados.rows.length}`);
    console.log(`✅ Instalaciones únicas: ${instalacionesUnicas.size}`);
    console.log(`✅ Consulta que no funciona: ${consultaQueNoFunciona.rows.length}`);
    console.log(`✅ CTE turnos_activos: ${turnosActivos.rows.length}`);
    console.log(`✅ Llamados automáticos: ${stats.total_llamados}`);

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

verificarConsultaInstalaciones();
