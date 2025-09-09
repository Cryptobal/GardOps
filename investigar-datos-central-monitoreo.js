// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function investigarDatosCentralMonitoreo() {
  console.log('🔍 Investigando datos del Central de Monitoreo...\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de investigación: ${fecha}`);

    // 1. Verificar instalaciones en central_llamados
    console.log('1. Verificando instalaciones en central_llamados...');
    const instalacionesCentral = await sql`
      SELECT DISTINCT 
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(*) as total_llamados
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE DATE(cl.programado_para) = ${fecha}
      GROUP BY cl.instalacion_id, i.nombre
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones en central_llamados: ${instalacionesCentral.rows.length}`);
    instalacionesCentral.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre || 'Sin nombre'} (ID: ${inst.instalacion_id}): ${inst.total_llamados} llamados`);
    });

    // 2. Verificar instalaciones en pauta mensual
    console.log('\n2. Verificando instalaciones en pauta mensual...');
    const instalacionesPauta = await sql`
      SELECT DISTINCT 
        i.id,
        i.nombre as instalacion_nombre,
        COUNT(*) as total_puestos
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND po.activo = true
      GROUP BY i.id, i.nombre
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones en pauta mensual: ${instalacionesPauta.rows.length}`);
    instalacionesPauta.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.total_puestos} puestos`);
    });

    // 3. Verificar instalaciones con configuración de monitoreo
    console.log('\n3. Verificando configuraciones de monitoreo...');
    const configuracionesMonitoreo = await sql`
      SELECT 
        i.id,
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      ORDER BY i.nombre
    `;

    console.log(`✅ Configuraciones de monitoreo: ${configuracionesMonitoreo.rows.length}`);
    configuracionesMonitoreo.rows.forEach(config => {
      console.log(`   - ${config.instalacion_nombre}: ${config.habilitado ? 'Habilitado' : 'Deshabilitado'} (${config.intervalo_minutos}min, ${config.ventana_inicio}-${config.ventana_fin})`);
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
    turnosActivos.rows.forEach(turno => {
      console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino} [Monitoreo: ${turno.monitoreo_habilitado ? 'Sí' : 'No'}]`);
    });

    // 5. Buscar específicamente Caicoma y Chañaral
    console.log('\n5. Buscando específicamente Caicoma y Chañaral...');
    
    // En central_llamados
    const caicomaChañaralCentral = await sql`
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.estado
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE DATE(cl.programado_para) = ${fecha}
        AND (i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%')
    `;

    console.log(`✅ Caicoma/Chañaral en central_llamados: ${caicomaChañaralCentral.rows.length}`);
    caicomaChañaralCentral.rows.forEach(llamado => {
      console.log(`   - ${llamado.instalacion_nombre}: ${llamado.estado} (${llamado.programado_para})`);
    });

    // En pauta mensual
    const caicomaChañaralPauta = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND (i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%')
    `;

    console.log(`✅ Caicoma/Chañaral en pauta mensual: ${caicomaChañaralPauta.rows.length}`);
    caicomaChañaralPauta.rows.forEach(pauta => {
      console.log(`   - ${pauta.instalacion_nombre}: ${pauta.estado} (${pauta.rol_nombre})`);
    });

    // 6. Verificar todas las instalaciones en la base de datos
    console.log('\n6. Verificando todas las instalaciones en la base de datos...');
    const todasInstalaciones = await sql`
      SELECT 
        id,
        nombre,
        estado,
        telefono
      FROM instalaciones
      ORDER BY nombre
    `;

    console.log(`✅ Total de instalaciones en BD: ${todasInstalaciones.rows.length}`);
    todasInstalaciones.rows.forEach(inst => {
      console.log(`   - ${inst.nombre}: ${inst.estado} ${inst.telefono ? `(Tel: ${inst.telefono})` : '(Sin teléfono)'}`);
    });

    // 7. Verificar si hay datos de prueba o antiguos
    console.log('\n7. Verificando datos de prueba o antiguos...');
    const datosAntiguos = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        MIN(programado_para) as fecha_mas_antigua,
        MAX(programado_para) as fecha_mas_reciente
      FROM central_llamados
    `;

    console.log('✅ Información de fechas en central_llamados:');
    console.log(`   - Total llamados: ${datosAntiguos.rows[0].total_llamados}`);
    console.log(`   - Fecha más antigua: ${datosAntiguos.rows[0].fecha_mas_antigua}`);
    console.log(`   - Fecha más reciente: ${datosAntiguos.rows[0].fecha_mas_reciente}`);

    console.log('\n🎯 CONCLUSIÓN DE LA INVESTIGACIÓN:');
    console.log('=====================================');
    
    if (caicomaChañaralCentral.rows.length > 0) {
      console.log('❌ PROBLEMA ENCONTRADO:');
      console.log('   - Hay datos de Caicoma/Chañaral en central_llamados');
      console.log('   - Estos datos NO están en la pauta mensual actual');
      console.log('   - Posibles causas:');
      console.log('     * Datos de prueba antiguos');
      console.log('     * Función de generación de agenda defectuosa');
      console.log('     * Instalaciones eliminadas pero datos persistentes');
    } else {
      console.log('✅ NO HAY PROBLEMA:');
      console.log('   - No se encontraron datos de Caicoma/Chañaral');
    }

  } catch (error) {
    console.error('❌ Error en la investigación:', error);
  } finally {
    process.exit(0);
  }
}

investigarDatosCentralMonitoreo();
