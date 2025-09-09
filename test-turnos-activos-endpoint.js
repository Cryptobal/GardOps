// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function testTurnosActivosEndpoint() {
  console.log('🔍 Probando endpoint de turnos activos...\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de prueba: ${fecha}`);

    // 1. Verificar turnos activos en la vista
    console.log('1. Verificando vista central_v_turnos_activos...');
    const vistaResult = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado,
        COUNT(*) as total_turnos
      FROM central_v_turnos_activos
      GROUP BY instalacion_nombre, guardia_nombre, rol_nombre, hora_inicio, hora_termino, monitoreo_habilitado
      ORDER BY instalacion_nombre, hora_inicio
      LIMIT 10
    `;

    console.log(`✅ Turnos en vista: ${vistaResult.rows.length}`);
    vistaResult.rows.forEach(t => {
      console.log(`   - ${t.instalacion_nombre}: ${t.guardia_nombre} (${t.rol_nombre}) ${t.hora_inicio}-${t.hora_termino} [Monitoreo: ${t.monitoreo_habilitado ? 'Sí' : 'No'}]`);
    });

    // 2. Verificar datos base para turnos activos
    console.log('\n2. Verificando datos base...');
    
    // Puestos operativos activos
    const puestosActivos = await sql`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos 
      WHERE activo = true
    `;
    console.log(`✅ Puestos operativos activos: ${puestosActivos.rows[0].total}`);

    // Pauta mensual activa
    const pautaActiva = await sql`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual 
      WHERE estado = 'Activo'
      AND anio = EXTRACT(YEAR FROM ${fecha}::date)
      AND mes = EXTRACT(MONTH FROM ${fecha}::date)
      AND dia = EXTRACT(DAY FROM ${fecha}::date)
    `;
    console.log(`✅ Pauta mensual activa para hoy: ${pautaActiva.rows[0].total}`);

    // Configuraciones de monitoreo
    const configMonitoreo = await sql`
      SELECT COUNT(*) as total
      FROM central_config_instalacion 
      WHERE habilitado = true
    `;
    console.log(`✅ Configuraciones de monitoreo habilitadas: ${configMonitoreo.rows[0].total}`);

    // 3. Simular la consulta del endpoint
    console.log('\n3. Simulando consulta del endpoint...');
    const endpointQuery = await sql`
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        g.id as guardia_id,
        COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
        g.telefono as guardia_telefono,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        po.nombre_puesto,
        po.id as puesto_id,
        pm.estado as estado_pauta,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.id as pauta_id,
        cci.habilitado as monitoreo_habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'Activo'
        AND (cci.habilitado = true OR cci.habilitado IS NULL)
        AND pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
      ORDER BY i.nombre ASC, rs.hora_inicio ASC
      LIMIT 10
    `;

    console.log(`✅ Resultados de la consulta: ${endpointQuery.rows.length}`);
    endpointQuery.rows.forEach(t => {
      console.log(`   - ${t.instalacion_nombre}: ${t.guardia_nombre} (${t.rol_nombre}) ${t.hora_inicio}-${t.hora_termino}`);
    });

    // 4. Verificar instalaciones con turnos pero sin configuración
    console.log('\n4. Verificando instalaciones sin configuración...');
    const sinConfig = await sql`
      SELECT DISTINCT i.nombre
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'Activo'
        AND cci.habilitado IS NULL
        AND pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones sin configuración: ${sinConfig.rows.length}`);
    sinConfig.rows.forEach(i => console.log(`   - ${i.nombre}`));

    // 5. Crear configuración para una instalación sin configuración
    if (sinConfig.rows.length > 0) {
      console.log('\n5. Creando configuración de prueba...');
      const instalacionSinConfig = sinConfig.rows[0].nombre;
      
      const instalacionId = await sql`
        SELECT id FROM instalaciones WHERE nombre = ${instalacionSinConfig} LIMIT 1
      `;

      if (instalacionId.rows.length > 0) {
        const id = instalacionId.rows[0].id;
        
        await sql`
          INSERT INTO central_config_instalacion (
            instalacion_id, habilitado, intervalo_minutos, ventana_inicio,
            ventana_fin, modo, mensaje_template
          )
          VALUES (
            ${id}, true, 60, '21:00', '07:00', 'whatsapp',
            'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'
          )
          ON CONFLICT (instalacion_id) DO UPDATE SET
            habilitado = EXCLUDED.habilitado,
            intervalo_minutos = EXCLUDED.intervalo_minutos,
            ventana_inicio = EXCLUDED.ventana_inicio,
            ventana_fin = EXCLUDED.ventana_fin,
            modo = EXCLUDED.modo,
            mensaje_template = EXCLUDED.mensaje_template,
            updated_at = now()
        `;
        
        console.log(`✅ Configuración creada para: ${instalacionSinConfig}`);
      }
    }

    console.log('\n🎉 Prueba de turnos activos completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la prueba de turnos activos:', error);
  } finally {
    process.exit(0);
  }
}

testTurnosActivosEndpoint();
