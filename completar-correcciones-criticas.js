const { sql } = require('@vercel/postgres');

async function completarCorreccionesCriticas() {
  console.log('🔧 COMPLETANDO CORRECCIONES CRÍTICAS DEL SISTEMA RBAC');
  console.log('===================================================\n');

  try {
    // ===============================================
    // 1. CREAR PERMISO RBAC.USUARIOS.WRITE
    // ===============================================
    console.log('🔐 1. CREANDO PERMISO RBAC.USUARIOS.WRITE');
    console.log('----------------------------------------');

    try {
      // Verificar si el permiso ya existe
      const permisoExistente = await sql`
        SELECT id FROM permisos WHERE clave = 'rbac.usuarios.write'
      `;

      if (permisoExistente.rows.length === 0) {
        // Crear el permiso
        const nuevoPermiso = await sql`
          INSERT INTO permisos (id, clave, descripcion, categoria)
          VALUES (
            gen_random_uuid(),
            'rbac.usuarios.write',
            'Crear y editar usuarios del sistema - Permite gestionar usuarios, asignar roles y modificar información de usuarios',
            'RBAC'
          )
          RETURNING id, clave
        `;

        console.log('✅ Permiso rbac.usuarios.write creado exitosamente');
        console.log(`   ID: ${nuevoPermiso.rows[0].id}`);
        console.log(`   Clave: ${nuevoPermiso.rows[0].clave}`);
      } else {
        console.log('ℹ️  Permiso rbac.usuarios.write ya existe');
      }
    } catch (error) {
      console.log('❌ Error creando permiso:', error.message);
    }

    console.log('');

    // ===============================================
    // 2. ASIGNAR ROLES A USUARIOS SIN ROLES
    // ===============================================
    console.log('👥 2. ASIGNANDO ROLES A USUARIOS SIN ROLES');
    console.log('-------------------------------------------');

    // 2.1 Asignar rol "Operador" a Pedro (guardia@gardops.com)
    console.log('📧 Procesando: guardia@gardops.com');
    
    try {
      const usuarioPedro = await sql`
        SELECT id FROM usuarios WHERE email = 'guardia@gardops.com'
      `;
      
      const rolOperador = await sql`
        SELECT id FROM roles WHERE nombre = 'Operador'
      `;

      if (usuarioPedro.rows.length > 0 && rolOperador.rows.length > 0) {
        const usuarioId = usuarioPedro.rows[0].id;
        const rolId = rolOperador.rows[0].id;

        // Verificar si ya tiene el rol asignado
        const asignacionExistente = await sql`
          SELECT 1 FROM usuarios_roles 
          WHERE usuario_id = ${usuarioId} AND rol_id = ${rolId}
        `;

        if (asignacionExistente.rows.length === 0) {
          // Asignar rol
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${usuarioId}, ${rolId})
          `;
          console.log('✅ Rol Operador asignado a Pedro (guardia@gardops.com)');
        } else {
          console.log('ℹ️  Pedro ya tiene el rol Operador asignado');
        }
      } else {
        console.log('❌ No se pudo asignar rol a Pedro: Usuario o rol no encontrado');
      }
    } catch (error) {
      console.log('❌ Error asignando rol a Pedro:', error.message);
    }

    // 2.2 Asignar rol "Supervisor" a Juan (supervisor@gardops.com)
    console.log('📧 Procesando: supervisor@gardops.com');
    
    try {
      const usuarioJuan = await sql`
        SELECT id FROM usuarios WHERE email = 'supervisor@gardops.com'
      `;
      
      const rolSupervisor = await sql`
        SELECT id FROM roles WHERE nombre = 'Supervisor'
      `;

      if (usuarioJuan.rows.length > 0 && rolSupervisor.rows.length > 0) {
        const usuarioId = usuarioJuan.rows[0].id;
        const rolId = rolSupervisor.rows[0].id;

        // Verificar si ya tiene el rol asignado
        const asignacionExistente = await sql`
          SELECT 1 FROM usuarios_roles 
          WHERE usuario_id = ${usuarioId} AND rol_id = ${rolId}
        `;

        if (asignacionExistente.rows.length === 0) {
          // Asignar rol
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${usuarioId}, ${rolId})
          `;
          console.log('✅ Rol Supervisor asignado a Juan (supervisor@gardops.com)');
        } else {
          console.log('ℹ️  Juan ya tiene el rol Supervisor asignado');
        }
      } else {
        console.log('❌ No se pudo asignar rol a Juan: Usuario o rol no encontrado');
      }
    } catch (error) {
      console.log('❌ Error asignando rol a Juan:', error.message);
    }

    console.log('');

    // ===============================================
    // 3. ASIGNAR PERMISOS AL ROL PLATFORM ADMIN
    // ===============================================
    console.log('👑 3. ASIGNANDO PERMISOS AL ROL PLATFORM ADMIN');
    console.log('-----------------------------------------------');

    try {
      // Obtener el rol Platform Admin
      const platformAdmin = await sql`
        SELECT id FROM roles WHERE nombre = 'Platform Admin' AND tenant_id IS NULL
      `;

      if (platformAdmin.rows.length > 0) {
        const platformAdminId = platformAdmin.rows[0].id;

        // Asignar permiso rbac.usuarios.write
        const permisoUsuariosWrite = await sql`
          SELECT id FROM permisos WHERE clave = 'rbac.usuarios.write'
        `;

        if (permisoUsuariosWrite.rows.length > 0) {
          const permisoId = permisoUsuariosWrite.rows[0].id;

          // Verificar si ya tiene el permiso asignado
          const asignacionExistente = await sql`
            SELECT 1 FROM roles_permisos 
            WHERE rol_id = ${platformAdminId} AND permiso_id = ${permisoId}
          `;

          if (asignacionExistente.rows.length === 0) {
            // Asignar permiso
            await sql`
              INSERT INTO roles_permisos (rol_id, permiso_id)
              VALUES (${platformAdminId}, ${permisoId})
            `;
            console.log('✅ Permiso rbac.usuarios.write asignado al rol Platform Admin');
          } else {
            console.log('ℹ️  Platform Admin ya tiene el permiso rbac.usuarios.write');
          }
        } else {
          console.log('❌ Permiso rbac.usuarios.write no encontrado');
        }

        // Asignar permiso rbac.platform_admin (si existe)
        const permisoPlatformAdmin = await sql`
          SELECT id FROM permisos WHERE clave = 'rbac.platform_admin'
        `;

        if (permisoPlatformAdmin.rows.length > 0) {
          const permisoId = permisoPlatformAdmin.rows[0].id;

          // Verificar si ya tiene el permiso asignado
          const asignacionExistente = await sql`
            SELECT 1 FROM roles_permisos 
            WHERE rol_id = ${platformAdminId} AND permiso_id = ${permisoId}
          `;

          if (asignacionExistente.rows.length === 0) {
            // Asignar permiso
            await sql`
              INSERT INTO roles_permisos (rol_id, permiso_id)
              VALUES (${platformAdminId}, ${permisoId})
            `;
            console.log('✅ Permiso rbac.platform_admin asignado al rol Platform Admin');
          } else {
            console.log('ℹ️  Platform Admin ya tiene el permiso rbac.platform_admin');
          }
        } else {
          console.log('❌ Permiso rbac.platform_admin no encontrado');
        }
      } else {
        console.log('❌ Rol Platform Admin no encontrado');
      }
    } catch (error) {
      console.log('❌ Error asignando permisos al Platform Admin:', error.message);
    }

    console.log('');

    // ===============================================
    // 4. VERIFICACIÓN FINAL
    // ===============================================
    console.log('🔍 4. VERIFICACIÓN FINAL');
    console.log('------------------------');

    try {
      // Verificar usuarios sin roles
      const usuariosSinRoles = await sql`
        SELECT COUNT(*) as count
        FROM usuarios u
        WHERE u.activo = true
        AND NOT EXISTS (
          SELECT 1 FROM usuarios_roles ur WHERE ur.usuario_id = u.id
        )
      `;

      // Verificar rol Platform Admin
      const platformAdminCount = await sql`
        SELECT COUNT(*) as count
        FROM roles 
        WHERE nombre = 'Platform Admin'
      `;

      // Verificar permiso rbac.usuarios.write
      const permisoCount = await sql`
        SELECT COUNT(*) as count
        FROM permisos 
        WHERE clave = 'rbac.usuarios.write'
      `;

      // Verificar permisos del Platform Admin
      const platformAdminPermisos = await sql`
        SELECT COUNT(*) as count
        FROM roles r
        JOIN roles_permisos rp ON r.id = rp.rol_id
        WHERE r.nombre = 'Platform Admin'
      `;

      console.log('📊 Estado después de las correcciones:');
      console.log(`   👥 Usuarios sin roles: ${usuariosSinRoles.rows[0].count}`);
      console.log(`   👑 Rol Platform Admin existe: ${platformAdminCount.rows[0].count > 0 ? 'SÍ' : 'NO'}`);
      console.log(`   🔐 Permiso rbac.usuarios.write existe: ${permisoCount.rows[0].count > 0 ? 'SÍ' : 'NO'}`);
      console.log(`   🔐 Permisos del Platform Admin: ${platformAdminPermisos.rows[0].count}`);

      // Calificar el resultado
      const usuariosSinRolesCount = usuariosSinRoles.rows[0].count;
      const tienePlatformAdmin = platformAdminCount.rows[0].count > 0;
      const tienePermiso = permisoCount.rows[0].count > 0;

      console.log('');
      if (usuariosSinRolesCount === 0 && tienePlatformAdmin && tienePermiso) {
        console.log('🎉 ¡ÉXITO! TODAS LAS CORRECCIONES CRÍTICAS APLICADAS EXITOSAMENTE');
        console.log('🎯 El sistema RBAC está listo para producción');
        console.log('✅ FASE 1 COMPLETADA');
      } else {
        console.log('⚠️  ALGUNAS CORRECCIONES PENDIENTES');
        if (usuariosSinRolesCount > 0) {
          console.log(`   - Aún hay ${usuariosSinRolesCount} usuarios sin roles`);
        }
        if (!tienePlatformAdmin) {
          console.log('   - Falta crear el rol Platform Admin');
        }
        if (!tienePermiso) {
          console.log('   - Falta crear el permiso rbac.usuarios.write');
        }
      }
    } catch (error) {
      console.log('❌ Error en verificación final:', error.message);
    }

    console.log('');
    console.log('===============================================');

  } catch (error) {
    console.error('❌ Error durante la ejecución de correcciones:', error.message);
  }
}

completarCorreccionesCriticas();
