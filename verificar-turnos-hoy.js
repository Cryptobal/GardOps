require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function verificarTurnosHoy() {
  console.log('🔍 Verificando turnos trabajados para hoy...\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha: ${fecha}`);

    // 1. Verificar todos los turnos para hoy
    console.log('1. Todos los turnos para hoy:');
    const todosTurnos = await sql`
      SELECT 
        pm.id,
        i.nombre as instalacion_nombre,
        pm.estado,
        pm.anio,
        pm.mes,
        pm.dia,
        rs.nombre as rol_nombre,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
      ORDER BY i.nombre, rs.nombre
    `;

    console.log(`   📋 Total de turnos: ${todosTurnos.rows.length}`);
    todosTurnos.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre}) - Puesto: ${turno.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 2. Verificar turnos trabajados específicamente
    console.log('\n2. Turnos en estado "trabajado":');
    const turnosTrabajados = await sql`
      SELECT 
        pm.id,
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
      ORDER BY i.nombre, rs.nombre
    `;

    console.log(`   📋 Turnos trabajados: ${turnosTrabajados.rows.length}`);
    turnosTrabajados.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre}) - Puesto: ${turno.puesto_activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // 3. Verificar turnos trabajados con puestos activos
    console.log('\n3. Turnos trabajados con puestos activos:');
    const turnosTrabajadosActivos = await sql`
      SELECT 
        pm.id,
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre,
        po.activo as puesto_activo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
        AND po.activo = true
      ORDER BY i.nombre, rs.nombre
    `;

    console.log(`   📋 Turnos trabajados con puestos activos: ${turnosTrabajadosActivos.rows.length}`);
    turnosTrabajadosActivos.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre})`);
    });

    // 4. Verificar configuración de monitoreo
    console.log('\n4. Configuración de monitoreo por instalación:');
    const configMonitoreo = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      ORDER BY i.nombre
    `;

    console.log(`   📋 Total de instalaciones: ${configMonitoreo.rows.length}`);
    configMonitoreo.rows.forEach(config => {
      console.log(`      - ${config.instalacion_nombre}: ${config.habilitado ? 'HABILITADO' : 'NO HABILITADO'}`);
      if (config.habilitado) {
        console.log(`        Config: ${config.intervalo_minutos}min (${config.ventana_inicio}-${config.ventana_fin})`);
      }
    });

    // 5. Verificar turnos trabajados con monitoreo habilitado
    console.log('\n5. Turnos trabajados con monitoreo habilitado:');
    const turnosConMonitoreo = await sql`
      SELECT 
        pm.id,
        i.nombre as instalacion_nombre,
        pm.estado,
        rs.nombre as rol_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND pm.estado = 'trabajado'
        AND po.activo = true
        AND cci.habilitado = true
      ORDER BY i.nombre, rs.nombre
    `;

    console.log(`   📋 Turnos trabajados con monitoreo habilitado: ${turnosConMonitoreo.rows.length}`);
    turnosConMonitoreo.rows.forEach(turno => {
      console.log(`      - ${turno.instalacion_nombre}: ${turno.estado} (${turno.rol_nombre})`);
      console.log(`        Monitoreo: ${turno.intervalo_minutos}min (${turno.ventana_inicio}-${turno.ventana_fin})`);
    });

    // 6. Resumen
    console.log('\n📋 RESUMEN:');
    console.log(`   - Total de turnos para hoy: ${todosTurnos.rows.length}`);
    console.log(`   - Turnos trabajados: ${turnosTrabajados.rows.length}`);
    console.log(`   - Turnos trabajados con puestos activos: ${turnosTrabajadosActivos.rows.length}`);
    console.log(`   - Turnos trabajados con monitoreo habilitado: ${turnosConMonitoreo.rows.length}`);

    if (turnosConMonitoreo.rows.length === 0) {
      console.log('\n❌ PROBLEMA: No hay turnos trabajados con monitoreo habilitado');
      console.log('🔧 SOLUCIÓN:');
      console.log('   1. Verificar que los turnos estén en estado "trabajado"');
      console.log('   2. Verificar que los puestos estén activos');
      console.log('   3. Verificar que las instalaciones tengan monitoreo habilitado');
    } else {
      console.log('\n✅ Hay turnos trabajados con monitoreo habilitado');
      console.log('   Los llamados automáticos deberían generarse correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarTurnosHoy();
