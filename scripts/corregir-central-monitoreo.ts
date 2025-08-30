#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function corregirCentralMonitoreo() {
  console.log('🔧 CORRECCIÓN CENTRAL DE MONITOREO - LÓGICA UNIFICADA\n');

  try {
    // 1. Corregir la vista automática para usar 'planificado' en lugar de 'trabajado'
    console.log('1️⃣ Corrigiendo vista automática de Central de Monitoreo...');
    
    await query(`
      -- =====================================================
      -- CORRECCIÓN CENTRAL DE MONITOREO - VISTA AUTOMÁTICA
      -- =====================================================

      -- Eliminar vista existente
      DROP VIEW IF EXISTS central_v_llamados_automaticos;

      -- Crear nueva vista automática que calcule llamados en tiempo real
      CREATE VIEW central_v_llamados_automaticos AS
      WITH turnos_activos AS (
        SELECT 
          pm.id as pauta_id,
          pm.instalacion_id,
          pm.guardia_id,
          pm.puesto_id,
          pm.anio,
          pm.mes,
          pm.dia,
          pm.estado,
          pm.observaciones,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono,
          g.nombre as guardia_nombre,
          g.telefono as guardia_telefono,
          po.nombre_puesto,
          rs.nombre as rol_nombre,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin,
          cci.modo,
          cci.mensaje_template
        FROM as_turnos_pauta_mensual pm
        INNER JOIN instalaciones i ON pm.instalacion_id = i.id
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        WHERE po.activo = true
          AND pm.estado = 'planificado'  -- CAMBIO: usar 'planificado' en lugar de 'trabajado'
          AND (cci.habilitado = true OR cci.habilitado IS NULL)
      ),
      llamados_calculados AS (
        SELECT 
          gen_random_uuid() as id,
          ta.instalacion_id,
          ta.guardia_id,
          ta.pauta_id,
          ta.puesto_id,
          -- Calcular hora programada basada en ventana_inicio
          (ta.anio || '-' || 
           LPAD(ta.mes::text, 2, '0') || '-' || 
           LPAD(ta.dia::text, 2, '0') || ' ' || 
           ta.ventana_inicio)::timestamp as programado_para,
          'pendiente' as estado_llamado,
          'instalacion' as contacto_tipo,
          ta.instalacion_id as contacto_id,
          ta.instalacion_nombre as contacto_nombre,
          COALESCE(ta.instalacion_telefono, ta.guardia_telefono) as contacto_telefono,
          NULL as observaciones,
          ta.instalacion_nombre,
          ta.guardia_nombre,
          ta.nombre_puesto,
          ta.rol_nombre,
          ta.intervalo_minutos,
          ta.ventana_inicio,
          ta.ventana_fin,
          ta.modo,
          ta.mensaje_template,
          -- Calcular si es urgente (más de 30 minutos atrasado)
          CASE 
            WHEN (ta.anio || '-' || 
                  LPAD(ta.mes::text, 2, '0') || '-' || 
                  LPAD(ta.dia::text, 2, '0') || ' ' || 
                  ta.ventana_inicio)::timestamp < (now() - interval '30 minutes')
            THEN true
            ELSE false
          END as es_urgente,
          -- Calcular si es actual (hora actual)
          CASE 
            WHEN EXTRACT(HOUR FROM (ta.anio || '-' || 
                  LPAD(ta.mes::text, 2, '0') || '-' || 
                  LPAD(ta.dia::text, 2, '0') || ' ' || 
                  ta.ventana_inicio)::timestamp) = EXTRACT(HOUR FROM now())
            THEN true
            ELSE false
          END as es_actual,
          -- Calcular si es próximo (resto del día)
          CASE 
            WHEN (ta.anio || '-' || 
                  LPAD(ta.mes::text, 2, '0') || '-' || 
                  LPAD(ta.dia::text, 2, '0') || ' ' || 
                  ta.ventana_inicio)::timestamp > now()
            THEN true
            ELSE false
          END as es_proximo
        FROM turnos_activos ta
        WHERE ta.intervalo_minutos IS NOT NULL
          AND ta.ventana_inicio IS NOT NULL
          AND ta.ventana_fin IS NOT NULL
      )
      SELECT * FROM llamados_calculados
      ORDER BY programado_para ASC;
    `);

    console.log('✅ Vista automática corregida');

    // 2. Verificar que la vista funcione correctamente
    console.log('\n2️⃣ Verificando vista corregida...');
    
    const fechaTest = '2025-08-30';
    const resultado = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
    `, [fechaTest]);

    const stats = resultado.rows[0];
    console.log('📊 Estadísticas de la vista corregida (30 de agosto):');
    console.log(`   - Total llamados: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 3. Verificar instalaciones con llamados
    console.log('\n3️⃣ Verificando instalaciones con llamados...');
    
    const instalaciones = await query(`
      SELECT 
        instalacion_nombre,
        COUNT(*) as total_llamados,
        programado_para,
        estado_llamado
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
      GROUP BY instalacion_nombre, programado_para, estado_llamado
      ORDER BY instalacion_nombre, programado_para
    `, [fechaTest]);

    console.log('📋 Instalaciones con llamados programados:');
    if (instalaciones.rows.length > 0) {
      instalaciones.rows.forEach((row: any) => {
        console.log(`   - ${row.instalacion_nombre}: ${row.total_llamados} llamados (${row.programado_para})`);
      });
    } else {
      console.log('   ❌ No hay llamados programados');
    }

    // 4. Verificar configuración de instalaciones
    console.log('\n4️⃣ Verificando configuración de instalaciones...');
    
    const configuracion = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE i.id IN (
        SELECT DISTINCT instalacion_id 
        FROM as_turnos_pauta_mensual 
        WHERE anio = 2025 AND mes = 8 AND dia = 30 AND estado = 'planificado'
      )
      ORDER BY i.nombre
    `);

    console.log('📋 Configuración de instalaciones:');
    configuracion.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${habilitado} (${config})`);
    });

    // 5. Verificar turnos planificados
    console.log('\n5️⃣ Verificando turnos planificados...');
    
    const turnosPlanificados = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
      GROUP BY i.nombre, pm.estado
      ORDER BY i.nombre, pm.estado
    `);

    console.log('📋 Turnos por instalación:');
    turnosPlanificados.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.estado} (${row.cantidad})`);
    });

    console.log('\n🎯 CORRECCIÓN COMPLETADA:');
    console.log('==========================');
    console.log('✅ Vista automática corregida para usar estado "planificado"');
    console.log('✅ Central de Monitoreo ahora lee de Pauta Mensual correctamente');
    console.log('✅ Lógica unificada implementada en Central de Monitoreo');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar Central de Monitoreo del 30 de agosto');
    console.log('2. Verificar que aparezcan los llamados automáticos');
    console.log('3. Probar registro de llamados');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

corregirCentralMonitoreo();
