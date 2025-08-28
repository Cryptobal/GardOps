require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixAdminRole() {
  try {
    console.log('🔧 Creando rol de admin y asignando permisos...\n');

    // 1. Crear rol de admin si no existe
    console.log('1. Creando rol de admin...');
    await sql`
      INSERT INTO rbac_roles (codigo, nombre, descripcion)
      VALUES ('admin', 'Administrador', 'Rol de administrador con todos los permisos')
      ON CONFLICT (codigo) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion;
    `;
    console.log('   ✅ Rol de admin creado/actualizado');

    // 2. Obtener ID del rol de admin
    const adminRole = await sql`
      SELECT id FROM rbac_roles WHERE codigo = 'admin' LIMIT 1;
    `;
    console.log('   ID del rol admin:', adminRole.rows[0]?.id);

    // 3. Obtener IDs de permisos de central_monitoring
    const centralPerms = await sql`
      SELECT id FROM rbac_permisos WHERE codigo LIKE 'central_monitoring.%';
    `;
    console.log('   Permisos de central_monitoring encontrados:', centralPerms.rows.length);

    // 4. Asignar permisos al rol de admin
    if (adminRole.rows[0] && centralPerms.rows.length > 0) {
      console.log('\n2. Asignando permisos al rol de admin...');
      
      for (const perm of centralPerms.rows) {
        await sql`
          INSERT INTO rbac_roles_permisos (role_id, permission_id, rol_codigo, permiso_cod, granted)
          VALUES (${adminRole.rows[0].id}, ${perm.id}, 'admin', ${perm.id}, true)
          ON CONFLICT (role_id, permission_id) DO UPDATE SET 
            granted = true,
            rol_codigo = 'admin',
            permiso_cod = ${perm.id};
        `;
      }
      console.log('   ✅ Permisos asignados');
    }

    // 5. Verificar asignaciones
    console.log('\n3. Verificando asignaciones...');
    const assignments = await sql`
      SELECT 
        r.nombre as rol,
        p.codigo as permiso,
        p.nombre as nombre_permiso,
        rp.granted
      FROM rbac_roles r
      JOIN rbac_roles_permisos rp ON r.id = rp.role_id
      JOIN rbac_permisos p ON rp.permission_id = p.id
      WHERE r.codigo = 'admin'
      AND p.codigo LIKE 'central_monitoring.%';
    `;
    
    console.log('   Asignaciones encontradas:', assignments.rows.length);
    assignments.rows.forEach(row => {
      console.log(`   - ${row.rol}: ${row.permiso} (${row.nombre_permiso}) - Granted: ${row.granted}`);
    });

    console.log('\n✅ Rol de admin configurado correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminRole();
