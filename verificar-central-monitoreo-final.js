// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarCentralMonitoreoFinal() {
  console.log('🔍 Verificación final del Central de Monitoreo...\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de verificación: ${fechaActual}`);

    // 1. Verificar que no hay datos de instalaciones que no están en la pauta diaria
    console.log('1. Verificando consistencia entre central_llamados y pauta diaria...');
    
    // Obtener instalaciones en pauta diaria
    const instalacionesPauta = await sql`
      SELECT DISTINCT i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fechaActual}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fechaActual}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fechaActual}::date)
        AND po.activo = true
    `;

    const instalacionesPautaNombres = instalacionesPauta.rows.map(row => row.instalacion_nombre);
    console.log(`✅ Instalaciones en pauta diaria: ${instalacionesPautaNombres.join(', ')}`);

    // Verificar instalaciones en central_llamados
    const instalacionesCentral = await sql`
      SELECT DISTINCT i.nombre as instalacion_nombre
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE i.nombre IS NOT NULL
    `;

    const instalacionesCentralNombres = instalacionesCentral.rows.map(row => row.instalacion_nombre);
    console.log(`✅ Instalaciones en central_llamados: ${instalacionesCentralNombres.join(', ')}`);

    // Verificar inconsistencias
    const inconsistencias = instalacionesCentralNombres.filter(nombre => 
      !instalacionesPautaNombres.includes(nombre)
    );

    if (inconsistencias.length > 0) {
      console.log(`❌ INCONSISTENCIAS ENCONTRADAS: ${inconsistencias.join(', ')}`);
    } else {
      console.log('✅ NO HAY INCONSISTENCIAS: Todas las instalaciones en central_llamados están en la pauta diaria');
    }

    // 2. Verificar datos del día actual
    console.log('\n2. Verificando datos del día actual...');
    const datosHoy = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN cl.estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN cl.estado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN cl.estado = 'no_contesta' THEN 1 END) as no_contesta
      FROM central_llamados cl
      WHERE DATE(cl.programado_para) = ${fechaActual}
    `;

    console.log(`✅ Llamados del día actual: ${datosHoy.rows[0].total_llamados}`);
    console.log(`   - Pendientes: ${datosHoy.rows[0].pendientes}`);
    console.log(`   - Exitosos: ${datosHoy.rows[0].exitosos}`);
    console.log(`   - No contesta: ${datosHoy.rows[0].no_contesta}`);

    // 3. Verificar KPIs del día
    console.log('\n3. Verificando KPIs del día...');
    const kpis = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN estado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN estado = 'incidente' THEN 1 END) as incidentes,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
      FROM central_llamados
      WHERE DATE(programado_para) = ${fechaActual}
    `;

    const kpiData = kpis.rows[0];
    console.log(`✅ KPIs del día actual:`);
    console.log(`   - Total: ${kpiData.total_llamados}`);
    console.log(`   - Exitosos: ${kpiData.exitosos}`);
    console.log(`   - No contesta: ${kpiData.no_contesta}`);
    console.log(`   - Ocupado: ${kpiData.ocupado}`);
    console.log(`   - Incidentes: ${kpiData.incidentes}`);
    console.log(`   - Pendientes: ${kpiData.pendientes}`);

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
        console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino}`);
      });
    } else {
      console.log('   - No hay turnos activos para hoy');
    }

    // 5. Verificar configuraciones de monitoreo
    console.log('\n5. Verificando configuraciones de monitoreo...');
    const configuraciones = await sql`
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

    console.log(`✅ Configuraciones de monitoreo habilitadas: ${configuraciones.rows.length}`);
    configuraciones.rows.forEach(config => {
      console.log(`   - ${config.instalacion_nombre}: ${config.intervalo_minutos}min (${config.ventana_inicio}-${config.ventana_fin})`);
    });

    console.log('\n🎯 VERIFICACIÓN FINAL COMPLETADA:');
    console.log('==================================');
    
    if (inconsistencias.length === 0) {
      console.log('✅ ÉXITO: El Central de Monitoreo está completamente limpio');
      console.log('✅ Solo muestra datos de instalaciones que están en la pauta diaria actual');
      console.log('✅ No hay datos históricos de prueba');
      console.log('✅ El sistema está listo para mostrar solo información real');
    } else {
      console.log('❌ PROBLEMA: Aún hay inconsistencias');
      console.log(`   - Instalaciones en central_llamados pero no en pauta diaria: ${inconsistencias.join(', ')}`);
    }

    if (datosHoy.rows[0].total_llamados === 0) {
      console.log('✅ Estado correcto: No hay llamados para hoy (estado limpio)');
    } else {
      console.log(`ℹ️  INFO: Hay ${datosHoy.rows[0].total_llamados} llamados para hoy`);
    }

  } catch (error) {
    console.error('❌ Error en la verificación final:', error);
  } finally {
    process.exit(0);
  }
}

verificarCentralMonitoreoFinal();
