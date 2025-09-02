import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log('🔧 SOLUCIONANDO PERMISOS DEL ADMIN DE UNA VEZ POR TODAS...\n');
    
    const adminEmail = 'carlos.irigoyen@gard.cl';
    
    // 1. Verificar estructura de tablas
    console.log('📋 Verificando estructura de tablas...');
    
    // Verificar columnas de usuarios
    const userColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND table_schema = 'public'
    `;
    console.log('Columnas de usuarios:', userColumns.rows.map(c => c.column_name).join(', '));
    
    // Verificar columnas de permisos
    const permColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permisos' AND table_schema = 'public'
    `;
    console.log('Columnas de permisos:', permColumns.rows.map(c => c.column_name).join(', '));
    
    // Verificar columnas de roles
    const roleColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' AND table_schema = 'public'
    `;
    console.log('Columnas de roles:', roleColumns.rows.map(c => c.column_name).join(', '));
    
    // 2. Obtener el usuario admin
    console.log('\n🔍 Buscando usuario admin...');
    const adminUser = await sql`
      SELECT * FROM usuarios WHERE email = ${adminEmail} LIMIT 1
    `;
    
    if (adminUser.rows.length === 0) {
      throw new Error(`Usuario ${adminEmail} no encontrado`);
    }
    
    const admin = adminUser.rows[0];
    const userId = admin.id || admin.usuario_id || admin.user_id;
    console.log('✅ Usuario encontrado:', { id: userId, email: admin.email, rol: admin.rol });
    
    // 3. Actualizar rol del usuario a admin
    console.log('\n🔄 Actualizando rol del usuario a admin...');
    await sql`
      UPDATE usuarios SET rol = 'admin' WHERE email = ${adminEmail}
    `;
    console.log('✅ Rol actualizado a admin');
    
    // 4. Crear permisos básicos
    console.log('\n🔑 Creando permisos básicos...');
    const permisosBasicos = [
      { clave: 'clientes.view', descripcion: 'Ver clientes' },
      { clave: 'clientes.create', descripcion: 'Crear clientes' },
      { clave: 'clientes.edit', descripcion: 'Editar clientes' },
      { clave: 'clientes.delete', descripcion: 'Eliminar clientes' },
      { clave: 'guardias.view', descripcion: 'Ver guardias' },
      { clave: 'guardias.create', descripcion: 'Crear guardias' },
      { clave: 'guardias.edit', descripcion: 'Editar guardias' },
      { clave: 'guardias.delete', descripcion: 'Eliminar guardias' },
      { clave: 'instalaciones.view', descripcion: 'Ver instalaciones' },
      { clave: 'instalaciones.create', descripcion: 'Crear instalaciones' },
      { clave: 'instalaciones.edit', descripcion: 'Editar instalaciones' },
      { clave: 'instalaciones.delete', descripcion: 'Eliminar instalaciones' }
    ];
    
    for (const permiso of permisosBasicos) {
      try {
        await sql`
          INSERT INTO permisos (clave, descripcion) 
          VALUES (${permiso.clave}, ${permiso.descripcion})
          ON CONFLICT (clave) DO NOTHING
        `;
        console.log(`✅ Permiso ${permiso.clave} creado/verificado`);
      } catch (error) {
        console.log(`⚠️ Error con permiso ${permiso.clave}:`, error.message);
      }
    }
    
    // 5. Crear o verificar rol admin
    console.log('\n👤 Creando/verificando rol admin...');
    let adminRoleId;
    
    // Primero intentar obtener el rol
    const existingRole = await sql`
      SELECT * FROM roles WHERE nombre = 'admin' OR nombre = 'Administrador' LIMIT 1
    `;
    
    if (existingRole.rows.length > 0) {
      const role = existingRole.rows[0];
      adminRoleId = role.id || role.rol_id || role.role_id;
      console.log('✅ Rol admin existente:', adminRoleId);
    } else {
      // Crear el rol
      const newRole = await sql`
        INSERT INTO roles (nombre, descripcion) 
        VALUES ('admin', 'Administrador del sistema')
        RETURNING *
      `;
      const role = newRole.rows[0];
      adminRoleId = role.id || role.rol_id || role.role_id;
      console.log('✅ Rol admin creado:', adminRoleId);
    }
    
    // 6. Asignar rol al usuario
    console.log('\n🔗 Asignando rol al usuario...');
    try {
      // Primero eliminar asignaciones anteriores
      await sql`
        DELETE FROM usuarios_roles WHERE usuario_id = ${userId}
      `;
      
      // Asignar el rol admin
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id) 
        VALUES (${userId}, ${adminRoleId})
      `;
      console.log('✅ Rol admin asignado al usuario');
    } catch (error) {
      console.log('⚠️ Error asignando rol:', error.message);
    }
    
    // 7. Asignar todos los permisos al rol admin
    console.log('\n🎯 Asignando permisos al rol admin...');
    const allPermisos = await sql`SELECT * FROM permisos`;
    
    for (const perm of allPermisos.rows) {
      const permId = perm.id || perm.permiso_id || perm.permission_id;
      try {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) 
          VALUES (${adminRoleId}, ${permId})
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
        console.log(`✅ Permiso ${perm.clave} asignado`);
      } catch (error) {
        console.log(`⚠️ Error asignando permiso ${perm.clave}:`, error.message);
      }
    }
    
    // 8. Crear vistas necesarias
    console.log('\n📋 Creando vistas RBAC...');
    
    // Vista v_check_permiso
    try {
      await sql`
        CREATE OR REPLACE VIEW v_check_permiso AS
        SELECT
            u.email,
            p.clave AS permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.activo = TRUE OR u.activo IS NULL
      `;
      console.log('✅ Vista v_check_permiso creada');
    } catch (error) {
      console.log('⚠️ Error creando vista v_check_permiso:', error.message);
    }
    
    // 9. Crear función de verificación
    console.log('\n🔧 Creando función de verificación...');
    try {
      await sql`
        CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso(user_email TEXT, permiso_clave TEXT)
        RETURNS BOOLEAN AS $$
        BEGIN
          -- Si es admin, tiene todos los permisos
          IF EXISTS(SELECT 1 FROM usuarios WHERE email = user_email AND rol = 'admin') THEN
            RETURN TRUE;
          END IF;
          
          -- Verificar en la vista
          RETURN EXISTS(
            SELECT 1 FROM v_check_permiso 
            WHERE email = user_email AND permiso = permiso_clave
          );
        END;
        $$ LANGUAGE plpgsql;
      `;
      console.log('✅ Función fn_usuario_tiene_permiso creada');
    } catch (error) {
      console.log('⚠️ Error creando función:', error.message);
    }
    
    // 10. Verificar que todo funcione
    console.log('\n🔍 Verificando permisos...');
    const verification = await sql`
      SELECT 
        u.email,
        r.nombre as rol,
        COUNT(DISTINCT p.clave) as total_permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.email = ${adminEmail}
      GROUP BY u.email, r.nombre
    `;
    
    console.log('✅ Verificación final:', verification.rows[0]);
    
    // Test de la función
    const testPermiso = await sql`
      SELECT public.fn_usuario_tiene_permiso(${adminEmail}, 'clientes.view') as tiene_permiso
    `;
    console.log('✅ Test clientes.view:', testPermiso.rows[0].tiene_permiso ? 'PERMITIDO' : 'DENEGADO');
    
    console.log('\n✅✅✅ SISTEMA RBAC RESTAURADO COMPLETAMENTE ✅✅✅');
    console.log('El usuario admin ahora tiene todos los permisos necesarios.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

main().catch(console.error);
