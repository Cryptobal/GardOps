import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔧 Arreglando permisos del usuario admin (estructura corregida)...\n');

    const adminEmail = 'carlos.irigoyen@gard.cl';

    // 1. Verificar si el usuario existe y es admin
    const user = await query(`
      SELECT id, email, rol, activo
      FROM usuarios 
      WHERE lower(email) = lower($1)
    `, [adminEmail]);

    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado:', adminEmail);
      return;
    }

    const userId = user.rows[0].id;
    console.log('✅ Usuario encontrado:', user.rows[0]);

    if (user.rows[0].rol !== 'admin') {
      console.log('❌ El usuario no es admin');
      return;
    }

    // 2. Verificar permisos existentes
    console.log('\n🔑 Verificando permisos existentes...');
    
    const existingPermissions = await query(`
      SELECT clave, descripcion
      FROM permisos 
      WHERE clave IN ('clientes.view', 'guardias.view', 'instalaciones.view')
      ORDER BY clave
    `);
    
    console.log('Permisos existentes:');
    existingPermissions.rows.forEach((perm: any) => {
      console.log(`   ✅ ${perm.clave}: ${perm.descripcion}`);
    });

    // 3. Crear permisos faltantes si no existen
    console.log('\n🔑 Creando permisos faltantes...');
    
    const basicPermissions = [
      { clave: 'clientes.view', descripcion: 'Permite ver la lista de clientes' },
      { clave: 'clientes.edit', descripcion: 'Permite crear, editar y eliminar clientes' },
      { clave: 'guardias.view', descripcion: 'Permite ver la lista de guardias' },
      { clave: 'guardias.edit', descripcion: 'Permite crear, editar y eliminar guardias' },
      { clave: 'instalaciones.view', descripcion: 'Permite ver la lista de instalaciones' },
      { clave: 'instalaciones.edit', descripcion: 'Permite crear, editar y eliminar instalaciones' }
    ];

    for (const perm of basicPermissions) {
      try {
        await query(`
          INSERT INTO permisos (id, clave, descripcion)
          VALUES (gen_random_uuid(), $1, $2)
          ON CONFLICT (clave) DO NOTHING
        `, [perm.clave, perm.descripcion]);
        console.log(`   ✅ Permiso creado: ${perm.clave}`);
      } catch (error) {
        console.log(`   ℹ️  Permiso ya existe: ${perm.clave}`);
      }
    }

    // 4. Crear rol admin si no existe
    console.log('\n👑 Creando rol admin...');
    
    let adminRoleId: string;
    const existingRole = await query(`
      SELECT id FROM roles WHERE nombre = 'Administrador' AND tenant_id IS NULL
    `);

    if (existingRole.rows.length > 0) {
      adminRoleId = existingRole.rows[0].id;
      console.log('   ℹ️  Rol admin ya existe');
    } else {
      const newRole = await query(`
        INSERT INTO roles (id, nombre, descripcion, tenant_id, activo)
        VALUES (gen_random_uuid(), 'Administrador', 'Rol de administrador con todos los permisos', NULL, true)
        RETURNING id
      `);
      adminRoleId = newRole.rows[0].id;
      console.log('   ✅ Rol admin creado');
    }

    // 5. Asignar rol al usuario
    console.log('\n🔗 Asignando rol al usuario...');
    
    const existingUserRole = await query(`
      SELECT usuario_id FROM usuarios_roles WHERE usuario_id = $1 AND rol_id = $2
    `, [userId, adminRoleId]);

    if (existingUserRole.rows.length === 0) {
      await query(`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES ($1, $2)
      `, [userId, adminRoleId]);
      console.log('   ✅ Rol asignado al usuario');
    } else {
      console.log('   ℹ️  Usuario ya tiene el rol admin');
    }

    // 6. Asignar todos los permisos al rol admin
    console.log('\n🔐 Asignando permisos al rol admin...');
    
    for (const perm of basicPermissions) {
      try {
        await query(`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          SELECT $1, p.id
          FROM permisos p
          WHERE p.clave = $2
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `, [adminRoleId, perm.clave]);
        console.log(`   ✅ Permiso asignado: ${perm.clave}`);
      } catch (error) {
        console.log(`   ℹ️  Permiso ya asignado: ${perm.clave}`);
      }
    }

    // 7. Verificar que todo funciona
    console.log('\n🧪 Verificando que todo funciona...');
    
    const testPermissions = ['clientes.view', 'guardias.view', 'instalaciones.view'];
    
    for (const perm of testPermissions) {
      try {
        const result = await query(`
          SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
        `, [adminEmail, perm]);
        
        const hasPermission = result.rows[0].allowed;
        console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}: ${hasPermission ? 'SÍ' : 'NO'}`);
      } catch (error) {
        console.log(`   ❌ Error verificando ${perm}:`, error);
      }
    }

    console.log('\n🎉 ¡Permisos del admin restaurados exitosamente!');
    console.log('📌 Ahora deberías poder ver clientes, guardias e instalaciones');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
