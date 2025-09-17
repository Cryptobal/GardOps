#!/usr/bin/env ts-node

import { sql } from '@vercel/postgres';

async function diagnosticoCompletoCentral() {
  console.log('🔍 DIAGNÓSTICO COMPLETO - CENTRAL DE MONITOREO\n');

  try {
    // 1. Verificar configuración de Bodega Santa Amalia
    console.log('1️⃣ Verificando configuración de Bodega Santa Amalia...');
    const configResult = await sql`
      SELECT 
        i.id,
        i.nombre,
        i.telefono,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
    `;
    
    console.log('📋 Configuración encontrada:');
    configResult.rows.forEach(row => {
      console.log(`  - ${row.nombre}:`);
      console.log(`    * ID: ${row.id}`);
      console.log(`    * Teléfono: ${row.telefono}`);
      console.log(`    * Habilitado: ${row.habilitado}`);
      console.log(`    * Intervalo: ${row.intervalo_minutos} min`);
      console.log(`    * Ventana: ${row.ventana_inicio} - ${row.ventana_fin}`);
      console.log(`    * Modo: ${row.modo}`);
    });

    if (configResult.rows.length === 0) {
      console.log('❌ No se encontró Bodega Santa Amalia');
      return;
    }

    const instalacionId = configResult.rows[0].id;
    console.log(`\n🎯 Usando instalación ID: ${instalacionId}`);

    // 2. Verificar puestos operativos activos
    console.log('\n2️⃣ Verificando puestos operativos activos...');
    const puestosResult = await sql`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.activo,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
    `, [instalacionId];
    
    console.log('📋 Puestos operativos:');
    puestosResult.rows.forEach(row => {
      console.log(`  - ${row.nombre_puesto} (${row.rol_nombre}): activo=${row.activo}`);
    });

    if (puestosResult.rows.length === 0) {
      console.log('❌ No hay puestos operativos para esta instalación');
      return;
    }

    // 3. Verificar pauta mensual para hoy y mañana
    console.log('\n3️⃣ Verificando pauta mensual...');
    const hoy = new Date();
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    const pautaResult = await sql`
      SELECT 
        pm.id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.guardia_id,
        pm.puesto_id,
        po.nombre_puesto,
        g.nombre as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE po.instalacion_id = $1
        AND (
          (pm.anio = $2 AND pm.mes = $3 AND pm.dia = $4) OR
          (pm.anio = $5 AND pm.mes = $6 AND pm.dia = $7)
        )
      ORDER BY pm.anio, pm.mes, pm.dia
    `, [
      instalacionId,
      hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate(),
      mañana.getFullYear(), mañana.getMonth() + 1, mañana.getDate()
    ];
    
    console.log('📋 Pauta mensual:');
    pautaResult.rows.forEach(row => {
      console.log(`  - ${row.anio}-${row.mes}-${row.dia}: ${row.estado} (${row.nombre_puesto}) - ${row.guardia_nombre || 'Sin guardia'}`);
    });

    if (pautaResult.rows.length === 0) {
      console.log('❌ No hay pauta mensual para hoy o mañana');
      return;
    }

    // 4. Verificar estados específicos
    console.log('\n4️⃣ Verificando estados específicos...');
    const estadosResult = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      WHERE po.instalacion_id = $1
        AND (
          (pm.anio = $2 AND pm.mes = $3 AND pm.dia = $4) OR
          (pm.anio = $5 AND pm.mes = $6 AND pm.dia = $7)
        )
      GROUP BY pm.estado
    `, [
      instalacionId,
      hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate(),
      mañana.getFullYear(), mañana.getMonth() + 1, mañana.getDate()
    ];
    
    console.log('📋 Estados encontrados:');
    estadosResult.rows.forEach(row => {
      console.log(`  - ${row.estado}: ${row.cantidad} turnos`);
    });

    // 5. Verificar la vista central_v_llamados_automaticos
    console.log('\n5️⃣ Verificando vista central_v_llamados_automaticos...');
    const vistaResult = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE THEN 1 END) as llamados_hoy,
        COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE + 1 THEN 1 END) as llamados_mañana
      FROM central_v_llamados_automaticos
      WHERE instalacion_id = $1
    `, [instalacionId];
    
    console.log('📋 Vista central_v_llamados_automaticos:');
    console.log(`  - Total llamados: ${vistaResult.rows[0].total_llamados}`);
    console.log(`  - Llamados hoy: ${vistaResult.rows[0].llamados_hoy}`);
    console.log(`  - Llamados mañana: ${vistaResult.rows[0].llamados_mañana}`);

    // 6. Verificar llamados específicos para hoy
    console.log('\n6️⃣ Verificando llamados específicos para hoy...');
    const llamadosHoyResult = await sql`
      SELECT 
        programado_para,
        instalacion_nombre,
        estado_llamado,
        es_urgente,
        es_actual,
        es_proximo
      FROM central_v_llamados_automaticos
      WHERE instalacion_id = $1
        AND DATE(programado_para) = CURRENT_DATE
      ORDER BY programado_para
      LIMIT 10
    `, [instalacionId];
    
    console.log('📋 Llamados para hoy:');
    if (llamadosHoyResult.rows.length === 0) {
      console.log('  ❌ No hay llamados para hoy');
    } else {
      llamadosHoyResult.rows.forEach(row => {
        console.log(`  - ${row.programado_para}: ${row.estado_llamado} (urgente=${row.es_urgente}, actual=${row.es_actual}, próximo=${row.es_proximo})`);
      });
    }

    // 7. Verificar la consulta exacta que usa la API
    console.log('\n7️⃣ Verificando consulta exacta de la API...');
    const apiResult = await sql`
      SELECT 
        id,
        instalacion_id,
        programado_para::text as programado_para,
        estado_llamado as estado,
        instalacion_nombre,
        es_urgente,
        es_actual,
        es_proximo
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
        AND instalacion_id = $2
      ORDER BY programado_para ASC
    `, [hoy.toISOString().split('T')[0], instalacionId];
    
    console.log('📋 Consulta API para hoy:');
    if (apiResult.rows.length === 0) {
      console.log('  ❌ La API no encuentra llamados para hoy');
    } else {
      console.log(`  ✅ La API encuentra ${apiResult.rows.length} llamados para hoy`);
      apiResult.rows.forEach(row => {
        console.log(`    - ${row.programado_para}: ${row.estado} (${row.instalacion_nombre})`);
      });
    }

    // 8. Verificar condiciones de la vista paso a paso
    console.log('\n8️⃣ Verificando condiciones de la vista paso a paso...');
    
    // Condición 1: Puestos activos
    const condicion1 = await sql`
      SELECT COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
    `, [instalacionId];
    console.log(`  ✅ Puestos activos: ${condicion1.rows[0].count}`);

    // Condición 2: Pauta con estado 'planificado'
    const condicion2 = await sql`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      WHERE po.instalacion_id = $1 
        AND pm.estado = 'planificado'
        AND (
          (pm.anio = $2 AND pm.mes = $3 AND pm.dia = $4) OR
          (pm.anio = $5 AND pm.mes = $6 AND pm.dia = $7)
        )
    `, [
      instalacionId,
      hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate(),
      mañana.getFullYear(), mañana.getMonth() + 1, mañana.getDate()
    ];
    console.log(`  ✅ Pauta con estado 'planificado': ${condicion2.rows[0].count}`);

    // Condición 3: Configuración habilitada
    const condicion3 = await sql`
      SELECT COUNT(*) as count
      FROM central_config_instalacion cci
      WHERE cci.instalacion_id = $1 
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    `, [instalacionId];
    console.log(`  ✅ Configuración completa: ${condicion3.rows[0].count}`);

    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticoCompletoCentral();

