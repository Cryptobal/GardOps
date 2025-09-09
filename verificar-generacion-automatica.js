// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarGeneracionAutomatica() {
  console.log('🔍 Verificando generación automática de llamados...\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha actual: ${fechaActual}`);

    // 1. Verificar si hay llamados para hoy
    console.log('1. Verificando llamados para hoy...');
    const llamadosHoy = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos
      FROM central_llamados cl
      WHERE DATE(cl.programado_para) = ${fechaActual}
    `;

    console.log(`✅ Llamados para hoy: ${llamadosHoy.rows[0].total_llamados}`);
    console.log(`   - Pendientes: ${llamadosHoy.rows[0].pendientes}`);
    console.log(`   - Exitosos: ${llamadosHoy.rows[0].exitosos}`);

    // 2. Verificar instalaciones en pauta diaria
    console.log('\n2. Verificando instalaciones en pauta diaria...');
    const instalacionesPauta = await sql`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN pm.estado = 'Activo' THEN 1 END) as puestos_activos
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

    console.log(`✅ Instalaciones en pauta diaria: ${instalacionesPauta.rows.length}`);
    instalacionesPauta.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.puestos_activos}/${inst.total_puestos} puestos activos`);
    });

    // 3. Verificar configuraciones de monitoreo
    console.log('\n3. Verificando configuraciones de monitoreo...');
    const configuracionesMonitoreo = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
      ORDER BY i.nombre
    `;

    console.log(`✅ Configuraciones de monitoreo habilitadas: ${configuracionesMonitoreo.rows.length}`);
    configuracionesMonitoreo.rows.forEach(config => {
      console.log(`   - ${config.instalacion_nombre}: ${config.intervalo_minutos}min (${config.ventana_inicio}-${config.ventana_fin})`);
    });

    // 4. Verificar vista de turnos activos
    console.log('\n4. Verificando vista de turnos activos...');
    const turnosActivos = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      ORDER BY instalacion_nombre, hora_inicio
    `;

    console.log(`✅ Turnos activos en vista: ${turnosActivos.rows.length}`);
    if (turnosActivos.rows.length > 0) {
      turnosActivos.rows.forEach(turno => {
        console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino} [Monitoreo: ${turno.monitoreo_habilitado ? 'Sí' : 'No'}]`);
      });
    } else {
      console.log('   - No hay turnos activos para hoy');
    }

    // 5. Verificar si existe la función de generación de agenda
    console.log('\n5. Verificando función de generación de agenda...');
    const funcionGeneracion = await sql`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name ILIKE '%generar%agenda%'
        AND routine_schema = 'public'
    `;

    console.log(`✅ Funciones de generación encontradas: ${funcionGeneracion.rows.length}`);
    funcionGeneracion.rows.forEach(func => {
      console.log(`   - ${func.routine_name} (${func.routine_type})`);
    });

    // 6. Verificar datos históricos para entender el patrón
    console.log('\n6. Verificando datos históricos...');
    const datosHistoricos = await sql`
      SELECT 
        DATE(programado_para) as fecha,
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
      FROM central_llamados
      WHERE programado_para >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(programado_para)
      ORDER BY fecha DESC
      LIMIT 7
    `;

    console.log(`✅ Datos históricos de los últimos 7 días:`);
    datosHistoricos.rows.forEach(dato => {
      console.log(`   - ${dato.fecha}: ${dato.total_llamados} total (${dato.pendientes} pendientes)`);
    });

    // 7. Verificar si hay algún proceso automático configurado
    console.log('\n7. Verificando procesos automáticos...');
    const procesosAutomaticos = await sql`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct
      FROM pg_stats 
      WHERE tablename = 'central_llamados'
      ORDER BY attname
    `;

    console.log(`✅ Estadísticas de central_llamados: ${procesosAutomaticos.rows.length} columnas`);
    procesosAutomaticos.rows.forEach(stat => {
      console.log(`   - ${stat.attname}: ${stat.n_distinct} valores distintos`);
    });

    console.log('\n🎯 DIAGNÓSTICO DE GENERACIÓN AUTOMÁTICA:');
    console.log('==========================================');
    
    if (llamadosHoy.rows[0].total_llamados === 0) {
      console.log('❌ PROBLEMA: No hay llamados para hoy');
      
      if (instalacionesPauta.rows.length === 0) {
        console.log('   - CAUSA: No hay instalaciones en la pauta diaria');
        console.log('   - SOLUCIÓN: Verificar que la pauta mensual tenga datos para hoy');
      } else if (configuracionesMonitoreo.rows.length === 0) {
        console.log('   - CAUSA: No hay configuraciones de monitoreo habilitadas');
        console.log('   - SOLUCIÓN: Habilitar monitoreo en las instalaciones');
      } else if (turnosActivos.rows.length === 0) {
        console.log('   - CAUSA: No hay turnos activos en la vista');
        console.log('   - SOLUCIÓN: Verificar que los turnos estén activos y en horario');
      } else {
        console.log('   - CAUSA: No se ha ejecutado la generación de agenda');
        console.log('   - SOLUCIÓN: Ejecutar "Generar Agenda" manualmente o verificar proceso automático');
      }
    } else {
      console.log('✅ ÉXITO: Hay llamados para hoy');
      console.log(`   - Total: ${llamadosHoy.rows[0].total_llamados}`);
      console.log(`   - Pendientes: ${llamadosHoy.rows[0].pendientes}`);
    }

    console.log('\n🔧 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. Verificar que la pauta mensual tenga datos para el 30 de agosto');
    console.log('2. Asegurar que las instalaciones tengan monitoreo habilitado');
    console.log('3. Ejecutar "Generar Agenda" manualmente si es necesario');
    console.log('4. Verificar que los turnos estén en horario de monitoreo');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarGeneracionAutomatica();
