// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function investigarATest1() {
  console.log('🔍 Investigando A Test 1 en el Central de Monitoreo...\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de investigación: ${fechaActual}`);

    // 1. Verificar A Test 1 en central_llamados
    console.log('1. Verificando A Test 1 en central_llamados...');
    const aTest1Central = await sql`
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.estado,
        cl.observaciones
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE i.nombre ILIKE '%a test 1%' OR i.nombre ILIKE '%a-test-1%'
      ORDER BY cl.programado_para DESC
    `;

    console.log(`✅ A Test 1 en central_llamados: ${aTest1Central.rows.length} llamados`);
    aTest1Central.rows.forEach((llamado, index) => {
      console.log(`   ${index + 1}. ${llamado.instalacion_nombre}: ${llamado.estado} (${llamado.programado_para})`);
      if (llamado.observaciones) {
        console.log(`      Observaciones: ${llamado.observaciones}`);
      }
    });

    // 2. Verificar A Test 1 en pauta mensual
    console.log('\n2. Verificando A Test 1 en pauta mensual...');
    const aTest1Pauta = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre,
        po.nombre_puesto,
        g.nombre as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fechaActual}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fechaActual}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fechaActual}::date)
        AND po.activo = true
        AND (i.nombre ILIKE '%a test 1%' OR i.nombre ILIKE '%a-test-1%')
    `;

    console.log(`✅ A Test 1 en pauta mensual: ${aTest1Pauta.rows.length} registros`);
    aTest1Pauta.rows.forEach((pauta, index) => {
      console.log(`   ${index + 1}. ${pauta.instalacion_nombre}: ${pauta.estado} (${pauta.rol_nombre}) - ${pauta.nombre_puesto} - ${pauta.guardia_nombre || 'Sin guardia'}`);
    });

    // 3. Verificar todas las instalaciones que contienen "test" en el nombre
    console.log('\n3. Verificando todas las instalaciones con "test" en el nombre...');
    const instalacionesTest = await sql`
      SELECT 
        id,
        nombre,
        estado,
        telefono
      FROM instalaciones
      WHERE nombre ILIKE '%test%'
      ORDER BY nombre
    `;

    console.log(`✅ Instalaciones con "test" en el nombre: ${instalacionesTest.rows.length}`);
    instalacionesTest.rows.forEach(inst => {
      console.log(`   - ${inst.nombre}: ${inst.estado} ${inst.telefono ? `(Tel: ${inst.telefono})` : '(Sin teléfono)'}`);
    });

    // 4. Verificar configuración de monitoreo para A Test 1
    console.log('\n4. Verificando configuración de monitoreo para A Test 1...');
    const configATest1 = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE i.nombre ILIKE '%a test 1%' OR i.nombre ILIKE '%a-test-1%'
    `;

    console.log(`✅ Configuración de monitoreo para A Test 1: ${configATest1.rows.length}`);
    configATest1.rows.forEach(config => {
      console.log(`   - ${config.instalacion_nombre}: ${config.habilitado ? 'Habilitado' : 'Deshabilitado'} (${config.intervalo_minutos}min, ${config.ventana_inicio}-${config.ventana_fin})`);
    });

    // 5. Verificar vista de turnos activos para A Test 1
    console.log('\n5. Verificando vista de turnos activos para A Test 1...');
    const turnosATest1 = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      WHERE instalacion_nombre ILIKE '%a test 1%' OR instalacion_nombre ILIKE '%a-test-1%'
      ORDER BY instalacion_nombre, hora_inicio
    `;

    console.log(`✅ Turnos activos para A Test 1: ${turnosATest1.rows.length}`);
    turnosATest1.rows.forEach(turno => {
      console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino} [Monitoreo: ${turno.monitoreo_habilitado ? 'Sí' : 'No'}]`);
    });

    // 6. Verificar qué instalaciones están realmente en la pauta diaria
    console.log('\n6. Verificando instalaciones en pauta diaria actual...');
    const instalacionesPautaDiaria = await sql`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_puestos
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fechaActual}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fechaActual}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fechaActual}::date)
        AND po.activo = true
      GROUP BY i.nombre
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones en pauta diaria actual: ${instalacionesPautaDiaria.rows.length}`);
    instalacionesPautaDiaria.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.total_puestos} puestos`);
    });

    console.log('\n🎯 CONCLUSIÓN DE LA INVESTIGACIÓN:');
    console.log('====================================');
    
    if (aTest1Central.rows.length > 0 && aTest1Pauta.rows.length === 0) {
      console.log('❌ PROBLEMA IDENTIFICADO:');
      console.log('   - A Test 1 aparece en central_llamados pero NO está en la pauta diaria');
      console.log('   - Estos son datos históricos que deben ser eliminados');
      console.log('   - RECOMENDACIÓN: Limpiar datos de A Test 1 del central de monitoreo');
    } else if (aTest1Central.rows.length > 0 && aTest1Pauta.rows.length > 0) {
      console.log('✅ DATOS CORRECTOS:');
      console.log('   - A Test 1 está tanto en central_llamados como en la pauta diaria');
    } else if (aTest1Central.rows.length === 0) {
      console.log('✅ NO HAY PROBLEMA:');
      console.log('   - No hay datos de A Test 1 en central_llamados');
    }

  } catch (error) {
    console.error('❌ Error en la investigación:', error);
  } finally {
    process.exit(0);
  }
}

investigarATest1();
