#!/usr/bin/env node

const { sql } = require('@vercel/postgres');

async function diagnosticoSimple() {
  console.log('🔍 DIAGNÓSTICO SIMPLE - CENTRAL DE MONITOREO\n');

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
        cci.ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
    `;
    
    console.log('📋 Configuración encontrada:');
    configResult.rows.forEach(row => {
      console.log(`  - ${row.nombre}: habilitado=${row.habilitado}, intervalo=${row.intervalo_minutos}, ventana=${row.ventana_inicio}-${row.ventana_fin}`);
    });

    if (configResult.rows.length === 0) {
      console.log('❌ No se encontró Bodega Santa Amalia');
      return;
    }

    const instalacionId = configResult.rows[0].id;
    console.log(`\n🎯 Usando instalación ID: ${instalacionId}`);

    // 2. Verificar estados en la pauta mensual
    console.log('\n2️⃣ Verificando estados en la pauta mensual...');
    const estadosResult = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      WHERE po.instalacion_id = ${instalacionId}
        AND (
          (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)) OR
          (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE + 1) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE + 1) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE + 1))
        )
      GROUP BY pm.estado
    `;
    
    console.log('📋 Estados encontrados:');
    estadosResult.rows.forEach(row => {
      console.log(`  - ${row.estado}: ${row.cantidad} turnos`);
    });

    // 3. Verificar la vista central_v_llamados_automaticos
    console.log('\n3️⃣ Verificando vista central_v_llamados_automaticos...');
    const vistaResult = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE THEN 1 END) as llamados_hoy,
        COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE + 1 THEN 1 END) as llamados_mañana
      FROM central_v_llamados_automaticos
      WHERE instalacion_id = ${instalacionId}
    `;
    
    console.log('📋 Vista central_v_llamados_automaticos:');
    console.log(`  - Total llamados: ${vistaResult.rows[0].total_llamados}`);
    console.log(`  - Llamados hoy: ${vistaResult.rows[0].llamados_hoy}`);
    console.log(`  - Llamados mañana: ${vistaResult.rows[0].llamados_mañana}`);

    // 4. Verificar llamados específicos para hoy
    console.log('\n4️⃣ Verificando llamados específicos para hoy...');
    const llamadosHoyResult = await sql`
      SELECT 
        programado_para,
        instalacion_nombre,
        estado_llamado
      FROM central_v_llamados_automaticos
      WHERE instalacion_id = ${instalacionId}
        AND DATE(programado_para) = CURRENT_DATE
      ORDER BY programado_para
      LIMIT 5
    `;
    
    console.log('📋 Llamados para hoy:');
    if (llamadosHoyResult.rows.length === 0) {
      console.log('  ❌ No hay llamados para hoy');
    } else {
      llamadosHoyResult.rows.forEach(row => {
        console.log(`  - ${row.programado_para}: ${row.estado_llamado}`);
      });
    }

    // 5. Verificar condiciones de la vista paso a paso
    console.log('\n5️⃣ Verificando condiciones de la vista paso a paso...');
    
    // Condición 1: Puestos activos
    const condicion1 = await sql`
      SELECT COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = ${instalacionId} AND po.activo = true
    `;
    console.log(`  ✅ Puestos activos: ${condicion1.rows[0].count}`);

    // Condición 2: Pauta con estado 'planificado'
    const condicion2 = await sql`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      WHERE po.instalacion_id = ${instalacionId} 
        AND pm.estado = 'planificado'
        AND (
          (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)) OR
          (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE + 1) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE + 1) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE + 1))
        )
    `;
    console.log(`  ✅ Pauta con estado 'planificado': ${condicion2.rows[0].count}`);

    // Condición 3: Configuración habilitada
    const condicion3 = await sql`
      SELECT COUNT(*) as count
      FROM central_config_instalacion cci
      WHERE cci.instalacion_id = ${instalacionId} 
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    `;
    console.log(`  ✅ Configuración completa: ${condicion3.rows[0].count}`);

    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
}

diagnosticoSimple();


