// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function testCentralMonitoring() {
  console.log('🔍 Probando Central de Monitoreo...\n');

  try {
    // 1. Verificar que las tablas existen
    console.log('1. Verificando tablas...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'central_%'
      ORDER BY table_name
    `;
    console.log('✅ Tablas encontradas:', tables.rows.map(r => r.table_name));

    // 2. Verificar permisos
    console.log('\n2. Verificando permisos...');
    const permisos = await sql`
      SELECT clave, descripcion, categoria 
      FROM permisos 
      WHERE clave LIKE 'central_monitoring.%'
      ORDER BY clave
    `;
    console.log('✅ Permisos encontrados:', permisos.rows.length);
    permisos.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));

    // 3. Verificar rol
    console.log('\n3. Verificando rol...');
    const roles = await sql`
      SELECT nombre, descripcion 
      FROM roles 
      WHERE nombre = 'central_monitoring.operator'
    `;
    console.log('✅ Rol encontrado:', roles.rows.length > 0 ? roles.rows[0].nombre : 'NO');

    // 4. Verificar asignación de permisos al rol
    console.log('\n4. Verificando permisos del rol...');
    const rolPermisos = await sql`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'central_monitoring.operator'
      ORDER BY p.clave
    `;
    console.log('✅ Permisos del rol:', rolPermisos.rows.length);
    rolPermisos.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));

    // 5. Verificar usuario carlos
    console.log('\n5. Verificando usuario carlos...');
    const usuario = await sql`
      SELECT id, email, tenant_id 
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    console.log('✅ Usuario encontrado:', usuario.rows.length > 0 ? usuario.rows[0].email : 'NO');

    // 6. Verificar roles del usuario
    console.log('\n6. Verificando roles del usuario...');
    const usuarioRoles = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      ORDER BY r.nombre
    `;
    console.log('✅ Roles del usuario:', usuarioRoles.rows.length);
    usuarioRoles.rows.forEach(r => console.log(`   - ${r.nombre}: ${r.descripcion}`));

    // 7. Verificar vista de turnos activos
    console.log('\n7. Verificando vista de turnos activos...');
    const vista = await sql`
      SELECT COUNT(*) as total
      FROM central_v_turnos_activos
    `;
    console.log('✅ Vista funcionando, registros:', vista.rows[0].total);

    // 8. Verificar instalaciones con configuración
    console.log('\n8. Verificando configuraciones de instalaciones...');
    const configs = await sql`
      SELECT 
        i.nombre as instalacion,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo
      FROM central_config_instalacion cci
      JOIN instalaciones i ON cci.instalacion_id = i.id
      ORDER BY i.nombre
      LIMIT 5
    `;
    console.log('✅ Configuraciones encontradas:', configs.rows.length);
    configs.rows.forEach(c => console.log(`   - ${c.instalacion}: ${c.habilitado ? 'Activo' : 'Inactivo'} (${c.intervalo_minutos}min, ${c.ventana_inicio}-${c.ventana_fin})`));

    // 9. Probar endpoint de configuración
    console.log('\n9. Probando endpoint de configuración...');
    const testInstalacion = await sql`
      SELECT id, nombre FROM instalaciones WHERE estado = 'Activo' LIMIT 1
    `;
    
    if (testInstalacion.rows.length > 0) {
      const instalacionId = testInstalacion.rows[0].id;
      console.log(`   Probando con instalación: ${testInstalacion.rows[0].nombre}`);
      
      // Simular request GET
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
        console.log('   ✅ Configuración encontrada');
      } else {
        console.log('   ⚠️  No hay configuración para esta instalación');
      }
    } else {
      console.log('   ⚠️  No hay instalaciones activas para probar');
    }

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Tablas: ${tables.rows.length}`);
    console.log(`   - Permisos: ${permisos.rows.length}`);
    console.log(`   - Rol: ${roles.rows.length > 0 ? 'Creado' : 'Faltante'}`);
    console.log(`   - Permisos del rol: ${rolPermisos.rows.length}`);
    console.log(`   - Usuario carlos: ${usuario.rows.length > 0 ? 'Encontrado' : 'No encontrado'}`);
    console.log(`   - Roles del usuario: ${usuarioRoles.rows.length}`);
    console.log(`   - Vista: ${vista.rows[0].total} registros`);
    console.log(`   - Configuraciones: ${configs.rows.length}`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    process.exit(0);
  }
}

testCentralMonitoring();
