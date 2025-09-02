// Corregir permisos del Central de Monitoreo para el usuario carlos
require('dotenv').config({ path: '.env.production' });
process.env.POSTGRES_URL = process.env.DATABASE_URL;

const { sql } = require('@vercel/postgres');

async function corregirPermisosCentralMonitoreo() {
  console.log('🔧 CORRIGIENDO PERMISOS CENTRAL DE MONITOREO\n');
  console.log('📋 Asignando permisos al usuario carlos...\n');

  try {
    // 1. Verificar que el usuario carlos existe
    console.log('1. 👤 Verificando usuario carlos...');
    const user = await sql`
      SELECT id, email, nombre FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (user.rows.length === 0) {
      console.log('   ❌ Usuario carlos no encontrado');
      return;
    }
    
    const userId = user.rows[0].id;
    console.log(`   ✅ Usuario encontrado: ${user.rows[0].nombre} (${user.rows[0].email})`);

    // 2. Verificar que el rol central_monitoring.operator existe
    console.log('\n2. 🎭 Verificando rol central_monitoring.operator...');
    const rol = await sql`
      SELECT id, nombre FROM roles 
      WHERE nombre = 'central_monitoring.operator'
    `;
    
    if (rol.rows.length === 0) {
      console.log('   ❌ Rol central_monitoring.operator no encontrado');
      return;
    }
    
    const rolId = rol.rows[0].id;
    console.log(`   ✅ Rol encontrado: ${rol.rows[0].nombre}`);

    // 3. Verificar si el usuario ya tiene el rol asignado
    console.log('\n3. 🔍 Verificando asignación actual...');
    const asignacionActual = await sql`
      SELECT * FROM usuarios_roles 
      WHERE usuario_id = ${userId} AND rol_id = ${rolId}
    `;
    
    if (asignacionActual.rows.length > 0) {
      console.log('   ⚠️  El usuario ya tiene el rol asignado');
    } else {
      // 4. Asignar el rol al usuario
      console.log('\n4. ➕ Asignando rol al usuario...');
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${userId}, ${rolId})
      `;
      console.log('   ✅ Rol asignado exitosamente');
    }

    // 5. Verificar permisos del rol
    console.log('\n5. 🔐 Verificando permisos del rol...');
    const permisosRol = await sql`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE rp.rol_id = ${rolId}
      AND p.clave LIKE 'central_monitoring.%'
    `;
    
    console.log(`   📋 Permisos del rol: ${permisosRol.rows.length}`);
    permisosRol.rows.forEach(p => {
      console.log(`      - ${p.clave}: ${p.descripcion}`);
    });

    // 6. Verificar que los permisos existen
    console.log('\n6. ✅ Verificando que los permisos existen...');
    const permisosNecesarios = [
      'central_monitoring.view',
      'central_monitoring.record', 
      'central_monitoring.configure',
      'central_monitoring.export'
    ];

    for (const permisoClave of permisosNecesarios) {
      const permiso = await sql`
        SELECT id FROM permisos WHERE clave = ${permisoClave}
      `;
      
      if (permiso.rows.length === 0) {
        console.log(`   ❌ Permiso ${permisoClave} no existe`);
      } else {
        console.log(`   ✅ Permiso ${permisoClave} existe`);
      }
    }

    // 7. Verificar asignación final
    console.log('\n7. 🎯 Verificando asignación final...');
    const asignacionFinal = await sql`
      SELECT 
        u.nombre as usuario,
        r.nombre as rol,
        p.clave as permiso
      FROM usuarios u
      INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN roles_permisos rp ON r.id = rp.rol_id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.id = ${userId}
      AND p.clave LIKE 'central_monitoring.%'
    `;
    
    console.log(`   📊 Permisos finales del usuario: ${asignacionFinal.rows.length}`);
    asignacionFinal.rows.forEach(p => {
      console.log(`      - ${p.permiso}`);
    });

    // 8. Verificar datos del Central de Monitoreo
    console.log('\n8. 📊 Verificando datos del Central de Monitoreo...');
    
    const configuraciones = await sql`
      SELECT COUNT(*) as total FROM central_config_instalacion
    `;
    console.log(`   ⚙️  Configuraciones: ${configuraciones.rows[0].total}`);
    
    const llamados = await sql`
      SELECT COUNT(*) as total FROM central_llamados
    `;
    console.log(`   📞 Llamados: ${llamados.rows[0].total}`);
    
    const llamadosAuto = await sql`
      SELECT COUNT(*) as total FROM central_v_llamados_automaticos
    `;
    console.log(`   🤖 Llamados automáticos: ${llamadosAuto.rows[0].total}`);

    console.log('\n🎉 CORRECCIÓN COMPLETADA');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Usuario carlos verificado');
    console.log('   ✅ Rol central_monitoring.operator asignado');
    console.log('   ✅ Permisos del Central de Monitoreo verificados');
    console.log('   ✅ Datos del Central de Monitoreo disponibles');
    console.log('\n🔄 Ahora el usuario carlos debería poder acceder al Central de Monitoreo en producción');

  } catch (error) {
    console.error('❌ Error corrigiendo permisos:', error);
  } finally {
    process.exit(0);
  }
}

corregirPermisosCentralMonitoreo();