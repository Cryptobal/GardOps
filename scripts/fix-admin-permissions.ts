import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔧 Arreglando permisos del usuario admin...\n');

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

    // 2. Crear permisos básicos si no existen
    console.log('\n🔑 Creando permisos básicos...');
    
    const basicPermissions = [
      { clave: 'clientes.view', nombre: 'Ver Clientes', descripcion: 'Permite ver la lista de clientes' },
      { clave: 'clientes.edit', nombre: 'Editar Clientes', descripcion: 'Permite crear, editar y eliminar clientes' },
      { clave: 'guardias.view', nombre: 'Ver Guardias', descripcion: 'Permite ver la lista de guardias' },
      { clave: 'guardias.edit', nombre: 'Editar Guardias', descripcion: 'Permite crear, editar y eliminar guardias' },
      { clave: 'instalaciones.view', nombre: 'Ver Instalaciones', descripcion: 'Permite ver la lista de instalaciones' },
      { clave: 'instalaciones.edit', nombre: 'Editar Instalaciones', descripcion: 'Permite crear, editar y eliminar instalaciones' },
      { clave: 'maestros.view', nombre: 'Ver Maestros', descripcion: 'Permite ver datos maestros del sistema' },
      { clave: 'maestros.edit', nombre: 'Editar Maestros', descripcion: 'Permite editar datos maestros del sistema' },
      { clave: 'turnos.view', nombre: 'Ver Turnos', descripcion: 'Permite ver turnos y pautas' },
      { clave: 'turnos.edit', nombre: 'Editar Turnos', descripcion: 'Permite editar turnos y marcar asistencia' },
      { clave: 'documentos.manage', nombre: 'Gestionar Documentos', descripcion: 'Permite gestionar documentos del sistema' },
      { clave: 'config.manage', nombre: 'Gestionar Configuración', descripcion: 'Permite gestionar configuración del sistema' }
    ];

    for (const perm of basicPermissions) {
      try {
        await query(`
          INSERT INTO permisos (id, tenant_id, nombre, clave, descripcion, activo)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
          ON CONFLICT (clave, tenant_id) DO NOTHING
        `, [user.rows[0].tenant_id, perm.nombre, perm.clave, perm.descripcion]);
        console.log(`   ✅ Permiso creado: ${perm.clave}`);
      } catch (error) {
        console.log(`   ℹ️  Permiso ya existe: ${perm.clave}`);
      }
    }

    // 3. Crear rol admin si no existe
    console.log('\n👑 Creando rol admin...');
    
    let adminRoleId: string;
    const existingRole = await query(`
      SELECT id FROM roles WHERE nombre = 'Administrador' AND tenant_id = $1
    `, [user.rows[0].tenant_id]);

    if (existingRole.rows.length > 0) {
      adminRoleId = existingRole.rows[0].id;
      console.log('   ℹ️  Rol admin ya existe');
    } else {
      const newRole = await query(`
        INSERT INTO roles (id, tenant_id, nombre, clave, descripcion, activo)
        VALUES (gen_random_uuid(), $1, 'Administrador', 'admin', 'Rol de administrador con todos los permisos', true)
        RETURNING id
      `, [user.rows[0].tenant_id]);
      adminRoleId = newRole.rows[0].id;
      console.log('   ✅ Rol admin creado');
    }

    // 4. Asignar rol al usuario
    console.log('\n🔗 Asignando rol al usuario...');
    
    const existingUserRole = await query(`
      SELECT id FROM usuarios_roles WHERE usuario_id = $1 AND rol_id = $2
    `, [userId, adminRoleId]);

    if (existingUserRole.rows.length === 0) {
      await query(`
        INSERT INTO usuarios_roles (id, usuario_id, rol_id, activo)
        VALUES (gen_random_uuid(), $1, $2, true)
      `, [userId, adminRoleId]);
      console.log('   ✅ Rol asignado al usuario');
    } else {
      console.log('   ℹ️  Usuario ya tiene el rol admin');
    }

    // 5. Asignar todos los permisos al rol admin
    console.log('\n🔐 Asignando permisos al rol admin...');
    
    for (const perm of basicPermissions) {
      try {
        await query(`
          INSERT INTO roles_permisos (id, rol_id, permiso_id, activo)
          SELECT gen_random_uuid(), $1, p.id, true
          FROM permisos p
          WHERE p.clave = $2 AND p.tenant_id = $3
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `, [adminRoleId, perm.clave, user.rows[0].tenant_id]);
        console.log(`   ✅ Permiso asignado: ${perm.clave}`);
      } catch (error) {
        console.log(`   ℹ️  Permiso ya asignado: ${perm.clave}`);
      }
    }

    // 6. Verificar que todo funciona
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
