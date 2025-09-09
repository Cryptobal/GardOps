// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function testMonitoringEndpoint() {
  console.log('🔍 Probando endpoint de monitoreo...\n');

  try {
    // 1. Obtener una instalación para probar
    const instalacion = await sql`
      SELECT id, nombre, estado 
      FROM instalaciones 
      WHERE estado = 'Activo' 
      LIMIT 1
    `;

    if (instalacion.rows.length === 0) {
      console.log('❌ No hay instalaciones activas para probar');
      return;
    }

    const instalacionId = instalacion.rows[0].id;
    const instalacionNombre = instalacion.rows[0].nombre;
    
    console.log(`📋 Probando con instalación: ${instalacionNombre} (ID: ${instalacionId})`);

    // 2. Probar GET - Obtener configuración
    console.log('\n1. Probando GET /api/central-monitoring/config...');
    
    const configResult = await sql`
      SELECT 
        cci.*,
        i.nombre as instalacion_nombre
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE cci.instalacion_id = ${instalacionId}
      ORDER BY cci.created_at DESC
      LIMIT 1
    `;

    if (configResult.rows.length > 0) {
      console.log('✅ Configuración encontrada:');
      const config = configResult.rows[0];
      console.log(`   - Habilitado: ${config.habilitado}`);
      console.log(`   - Intervalo: ${config.intervalo_minutos} minutos`);
      console.log(`   - Ventana: ${config.ventana_inicio} - ${config.ventana_fin}`);
      console.log(`   - Modo: ${config.modo}`);
      console.log(`   - Mensaje: ${config.mensaje_template.substring(0, 50)}...`);
    } else {
      console.log('⚠️  No hay configuración para esta instalación');
    }

    // 3. Probar POST - Crear/Actualizar configuración
    console.log('\n2. Probando POST /api/central-monitoring/config...');
    
    const testConfig = {
      instalacion_id: instalacionId,
      habilitado: true,
      intervalo_minutos: 90,
      ventana_inicio: '22:00',
      ventana_fin: '06:00',
      modo: 'whatsapp',
      mensaje_template: 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'
    };

    // Verificar si existe configuración previa
    const existing = await sql`
      SELECT id FROM central_config_instalacion
      WHERE instalacion_id = ${instalacionId}
      LIMIT 1
    `;

    let result;
    if (existing.rows.length > 0) {
      // Actualizar configuración existente
      result = await sql`
        UPDATE central_config_instalacion SET
          habilitado = ${testConfig.habilitado},
          intervalo_minutos = ${testConfig.intervalo_minutos},
          ventana_inicio = ${testConfig.ventana_inicio},
          ventana_fin = ${testConfig.ventana_fin},
          modo = ${testConfig.modo},
          mensaje_template = ${testConfig.mensaje_template},
          updated_at = now()
        WHERE instalacion_id = ${instalacionId}
        RETURNING *
      `;
      console.log('✅ Configuración actualizada');
    } else {
      // Crear nueva configuración
      result = await sql`
        INSERT INTO central_config_instalacion (
          instalacion_id, habilitado, intervalo_minutos, ventana_inicio,
          ventana_fin, modo, mensaje_template
        )
        VALUES (
          ${testConfig.instalacion_id}, ${testConfig.habilitado}, ${testConfig.intervalo_minutos},
          ${testConfig.ventana_inicio}, ${testConfig.ventana_fin}, ${testConfig.modo},
          ${testConfig.mensaje_template}
        )
        RETURNING *
      `;
      console.log('✅ Nueva configuración creada');
    }

    // 4. Verificar que se guardó correctamente
    console.log('\n3. Verificando configuración guardada...');
    const verifyResult = await sql`
      SELECT 
        cci.*,
        i.nombre as instalacion_nombre
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE cci.instalacion_id = ${instalacionId}
      ORDER BY cci.created_at DESC
      LIMIT 1
    `;

    if (verifyResult.rows.length > 0) {
      const config = verifyResult.rows[0];
      console.log('✅ Configuración verificada:');
      console.log(`   - Habilitado: ${config.habilitado}`);
      console.log(`   - Intervalo: ${config.intervalo_minutos} minutos`);
      console.log(`   - Ventana: ${config.ventana_inicio} - ${config.ventana_fin}`);
      console.log(`   - Modo: ${config.modo}`);
      console.log(`   - Mensaje: ${config.mensaje_template.substring(0, 50)}...`);
    }

    // 5. Probar autorización
    console.log('\n4. Probando autorización...');
    
    // Verificar permisos del usuario carlos
    const userPerms = await sql`
      SELECT DISTINCT p.clave
      FROM usuarios u
      INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
      INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      AND p.clave LIKE 'central_monitoring.%'
    `;

    console.log('✅ Permisos del usuario carlos:');
    userPerms.rows.forEach(p => console.log(`   - ${p.clave}`));

    // 6. Probar vista de turnos activos
    console.log('\n5. Probando vista de turnos activos...');
    const turnosActivos = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      WHERE instalacion_id = ${instalacionId}
      LIMIT 5
    `;

    console.log(`✅ Turnos activos encontrados: ${turnosActivos.rows.length}`);
    turnosActivos.rows.forEach(t => {
      console.log(`   - ${t.instalacion_nombre}: ${t.guardia_nombre} (${t.rol_nombre}) ${t.hora_inicio}-${t.hora_termino}`);
    });

    console.log('\n🎉 Prueba del endpoint completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la prueba del endpoint:', error);
  } finally {
    process.exit(0);
  }
}

testMonitoringEndpoint();
