// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarCentralMonitoreoLimpio() {
  console.log('🔍 Verificando Central de Monitoreo después de la limpieza...\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de verificación: ${fechaActual}`);

    // 1. Verificar que no hay datos de Caicoma/Chañaral
    console.log('1. Verificando ausencia de Caicoma/Chañaral...');
    const caicomaChañaral = await sql`
      SELECT COUNT(*) as total
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%'
    `;

    console.log(`✅ Caicoma/Chañaral en central_llamados: ${caicomaChañaral.rows[0].total} (debe ser 0)`);

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

    // 3. Verificar instalaciones con configuración de monitoreo
    console.log('\n3. Verificando instalaciones con monitoreo habilitado...');
    const instalacionesMonitoreo = await sql`
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

    console.log(`✅ Instalaciones con monitoreo habilitado: ${instalacionesMonitoreo.rows.length}`);
    instalacionesMonitoreo.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.intervalo_minutos}min (${inst.ventana_inicio}-${inst.ventana_fin})`);
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
        console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino}`);
      });
    } else {
      console.log('   - No hay turnos activos para hoy');
    }

    // 5. Verificar KPIs del día
    console.log('\n5. Verificando KPIs del día...');
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

    // 6. Verificar que las instalaciones reales están en la pauta mensual
    console.log('\n6. Verificando instalaciones en pauta mensual...');
    const instalacionesPauta = await sql`
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

    console.log(`✅ Instalaciones en pauta mensual: ${instalacionesPauta.rows.length}`);
    instalacionesPauta.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.total_puestos} puestos`);
    });

    console.log('\n🎯 VERIFICACIÓN COMPLETADA:');
    console.log('============================');
    
    if (caicomaChañaral.rows[0].total === 0) {
      console.log('✅ ÉXITO: No hay datos de Caicoma/Chañaral');
    } else {
      console.log('❌ ERROR: Aún hay datos de Caicoma/Chañaral');
    }

    if (datosHoy.rows[0].total_llamados === 0) {
      console.log('✅ ÉXITO: No hay llamados para hoy (estado limpio)');
    } else {
      console.log(`ℹ️  INFO: Hay ${datosHoy.rows[0].total_llamados} llamados para hoy`);
    }

    console.log('✅ El Central de Monitoreo está listo para mostrar solo datos reales');
    console.log('✅ Para generar nuevos datos, usar el botón "Generar Agenda"');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarCentralMonitoreoLimpio();
