require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function investigarLlamadosAutomaticos() {
  console.log('🔍 Investigando por qué no hay llamados automáticos...\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de investigación: ${fecha}`);

    // 1. Verificar turnos trabajados con configuración
    console.log('1. Verificando turnos trabajados con configuración...');
    const turnosConConfig = await sql`
      SELECT 
        pm.id as pauta_id,
        i.nombre as instalacion_nombre,
        pm.estado,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        po.activo as puesto_activo,
        rs.nombre as rol_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
      ORDER BY i.nombre
    `;

    console.log(`   📋 Turnos trabajados con configuración: ${turnosConConfig.rows.length}`);
    turnosConConfig.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre})`);
      console.log(`        Config: ${turno.habilitado ? 'HABILITADO' : 'NO HABILITADO'}, ${turno.intervalo_minutos}min, ${turno.ventana_inicio}-${turno.ventana_fin}`);
      console.log(`        Puesto: ${turno.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 2. Verificar qué turnos NO tienen configuración
    console.log('\n2. Verificando turnos trabajados SIN configuración...');
    const turnosSinConfig = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
        AND (cci.habilitado IS NULL OR cci.habilitado = false)
      ORDER BY i.nombre
    `;

    console.log(`   📋 Turnos trabajados SIN configuración: ${turnosSinConfig.rows.length}`);
    turnosSinConfig.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre})`);
    });

    // 3. Verificar la vista automática paso a paso
    console.log('\n3. Verificando vista automática paso a paso...');
    
    // Paso 1: Turnos activos
    const turnosActivos = await sql`
      SELECT 
        pm.id as pauta_id,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        pm.estado,
        po.activo as puesto_activo,
        cci.habilitado
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
        AND po.activo = true
    `;

    console.log(`   📋 Turnos activos (paso 1): ${turnosActivos.rows.length}`);
    turnosActivos.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (habilitado: ${turno.habilitado})`);
    });

    // Paso 2: Con configuración habilitada
    const conConfigHabilitada = turnosActivos.rows.filter(t => t.habilitado === true);
    console.log(`   📋 Con configuración habilitada (paso 2): ${conConfigHabilitada.length}`);

    // Paso 3: Con configuración completa
    const conConfigCompleta = await sql`
      SELECT 
        ta.instalacion_id,
        ta.instalacion_nombre,
        ta.intervalo_minutos,
        ta.ventana_inicio,
        ta.ventana_fin
      FROM (
        SELECT 
          pm.instalacion_id,
          i.nombre as instalacion_nombre,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin
        FROM as_turnos_pauta_mensual pm
        INNER JOIN instalaciones i ON pm.instalacion_id = i.id
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
          AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
          AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
          AND pm.estado = 'trabajado'
          AND po.activo = true
          AND cci.habilitado = true
      ) ta
      WHERE ta.intervalo_minutos IS NOT NULL
        AND ta.ventana_inicio IS NOT NULL
        AND ta.ventana_fin IS NOT NULL
    `;

    console.log(`   📋 Con configuración completa (paso 3): ${conConfigCompleta.rows.length}`);
    conConfigCompleta.rows.forEach(config => {
      console.log(`      - ${config.instalacion_nombre}: ${config.intervalo_minutos}min (${config.ventana_inicio}-${config.ventana_fin})`);
    });

    // 4. Verificar datos en la vista automática
    console.log('\n4. Verificando datos en la vista automática...');
    const datosVista = await sql`
      SELECT 
        instalacion_nombre,
        programado_para,
        estado_llamado,
        es_urgente,
        es_actual,
        es_proximo
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = ${fecha}
      ORDER BY instalacion_nombre, programado_para
    `;

    console.log(`   📊 Llamados en vista automática: ${datosVista.rows.length}`);
    if (datosVista.rows.length > 0) {
      datosVista.rows.forEach(llamado => {
        console.log(`      - ${llamado.instalacion_nombre}: ${llamado.programado_para} (${llamado.estado_llamado})`);
      });
    } else {
      console.log('      ❌ No hay llamados en la vista automática');
    }

    // 5. Resumen y recomendaciones
    console.log('\n📋 ANÁLISIS Y RECOMENDACIONES:');
    
    if (conConfigCompleta.rows.length === 0) {
      console.log('   ❌ PROBLEMA: No hay turnos con configuración completa');
      console.log('   🔧 SOLUCIÓN: Verificar que las instalaciones tengan:');
      console.log('      - Monitoreo habilitado (habilitado = true)');
      console.log('      - Intervalo de minutos definido');
      console.log('      - Ventana de inicio y fin definida');
    } else if (datosVista.rows.length === 0) {
      console.log('   ❌ PROBLEMA: Hay configuración pero no se generan llamados');
      console.log('   🔧 SOLUCIÓN: Verificar la lógica de la vista automática');
    } else {
      console.log('   ✅ Los llamados automáticos están funcionando correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante la investigación:', error);
  }
}

investigarLlamadosAutomaticos();
