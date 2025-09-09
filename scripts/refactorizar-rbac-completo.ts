import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface RolUsuario {
  usuario_id: string;
  email: string;
  nombre: string;
  rol_campo: string;
  tenant_id: string;
}

async function refactorizarSistemaRBAC() {
  console.log('🔧 INICIANDO REFACTORIZACIÓN COMPLETA DEL SISTEMA RBAC');
  console.log('=' . repeat(80));
  console.log('\n📋 OBJETIVO: Implementar UN ROL POR USUARIO para evitar conflictos\n');
  
  try {
    // ==================================================
    // PASO 1: ASIGNAR ROL A CARLOS BASADO EN SU CAMPO 'rol'
    // ==================================================
    console.log('\n📍 PASO 1: Asignar rol correcto a carlos.irigoyen@gard.cl');
    console.log('-'.repeat(50));
    
    // Obtener información de Carlos
    const carlosInfo = await sql`
      SELECT 
        id,
        email,
        nombre,
        rol as rol_campo,
        tenant_id
      FROM usuarios
      WHERE LOWER(email) = 'carlos.irigoyen@gard.cl'
    `;
    
    if (carlosInfo.rows.length === 0) {
      throw new Error('Usuario carlos.irigoyen@gard.cl no encontrado');
    }
    
    const carlos = carlosInfo.rows[0];
    console.log(`   Usuario encontrado: ${carlos.email}`);
    console.log(`   Rol en campo: ${carlos.rol_campo}`);
    console.log(`   Tenant: ${carlos.tenant_id || 'NULL'}`);
    
    // Buscar o crear el rol de Super Admin para Carlos
    let rolSuperAdmin = await sql`
      SELECT id, nombre 
      FROM roles 
      WHERE nombre = 'Super Admin'
      AND (tenant_id = ${carlos.tenant_id} OR tenant_id IS NULL)
      LIMIT 1
    `;
    
    if (rolSuperAdmin.rows.length === 0) {
      console.log('   Creando rol Super Admin...');
      rolSuperAdmin = await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id)
        VALUES (
          'Super Admin',
          'Administrador con acceso completo al sistema',
          ${carlos.tenant_id}
        )
        RETURNING id, nombre
      `;
    }
    
    const rolId = rolSuperAdmin.rows[0].id;
    console.log(`   Rol Super Admin ID: ${rolId}`);
    
    // Asignar TODOS los permisos al rol Super Admin
    console.log('   Asignando todos los permisos al rol Super Admin...');
    await sql`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT ${rolId}, p.id
      FROM permisos p
      ON CONFLICT DO NOTHING
    `;
    
    // Limpiar cualquier rol existente de Carlos
    console.log('   Limpiando roles anteriores de Carlos...');
    await sql`
      DELETE FROM usuarios_roles
      WHERE usuario_id = ${carlos.id}
    `;
    
    // Asignar el rol Super Admin a Carlos
    console.log('   Asignando rol Super Admin a Carlos...');
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      VALUES (${carlos.id}, ${rolId})
    `;
    
    console.log('   ✅ Rol Super Admin asignado correctamente a Carlos');
    
    // ==================================================
    // PASO 2: ASIGNAR ROLES A OTROS USUARIOS SIN ROLES
    // ==================================================
    console.log('\n📍 PASO 2: Asignar roles a usuarios sin roles');
    console.log('-'.repeat(50));
    
    // Usuarios sin roles
    const usuariosSinRoles = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.rol as rol_campo,
        u.tenant_id
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      WHERE ur.usuario_id IS NULL
      AND u.activo = true
      AND LOWER(u.email) != 'carlos.irigoyen@gard.cl'
    `;
    
    for (const usuario of usuariosSinRoles.rows) {
      console.log(`\n   Procesando: ${usuario.email}`);
      console.log(`   Rol en campo: ${usuario.rol_campo || 'no definido'}`);
      
      let rolNombre = 'Operador'; // Rol por defecto
      
      // Determinar rol basado en el campo 'rol' o el email
      if (usuario.rol_campo === 'admin') {
        rolNombre = 'Admin';
      } else if (usuario.rol_campo === 'supervisor' || usuario.email.includes('supervisor')) {
        rolNombre = 'Supervisor';
      } else if (usuario.rol_campo === 'guardia' || usuario.email.includes('guardia')) {
        rolNombre = 'Operador';
      }
      
      // Buscar o crear el rol
      let rol = await sql`
        SELECT id 
        FROM roles 
        WHERE nombre = ${rolNombre}
        AND (tenant_id = ${usuario.tenant_id} OR tenant_id IS NULL)
        LIMIT 1
      `;
      
      if (rol.rows.length === 0) {
        console.log(`   Creando rol ${rolNombre}...`);
        rol = await sql`
          INSERT INTO roles (nombre, descripcion, tenant_id)
          VALUES (
            ${rolNombre},
            ${rolNombre === 'Admin' ? 'Administrador del tenant' : 
              rolNombre === 'Supervisor' ? 'Supervisor operativo' : 'Operador básico'},
            ${usuario.tenant_id}
          )
          RETURNING id
        `;
        
        // Asignar permisos básicos al rol
        const permisosBasicos = rolNombre === 'Admin' ? 
          ['%'] : // Admin obtiene todos
          rolNombre === 'Supervisor' ? 
          ['%.view', 'turnos.%', 'guardias.%', 'instalaciones.%'] :
          ['%.view']; // Operador solo puede ver
        
        for (const permPattern of permisosBasicos) {
          if (permPattern === '%') {
            // Asignar todos los permisos
            await sql`
              INSERT INTO roles_permisos (rol_id, permiso_id)
              SELECT ${rol.rows[0].id}, p.id
              FROM permisos p
              ON CONFLICT DO NOTHING
            `;
          } else {
            // Asignar permisos que coincidan con el patrón
            await sql`
              INSERT INTO roles_permisos (rol_id, permiso_id)
              SELECT ${rol.rows[0].id}, p.id
              FROM permisos p
              WHERE p.clave LIKE ${permPattern.replace('%', '%')}
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }
      
      // Asignar el rol al usuario
      console.log(`   Asignando rol ${rolNombre} al usuario...`);
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${usuario.id}, ${rol.rows[0].id})
        ON CONFLICT DO NOTHING
      `;
      
      console.log(`   ✅ Rol ${rolNombre} asignado a ${usuario.email}`);
    }
    
    // ==================================================
    // PASO 3: IMPLEMENTAR POLÍTICA DE UN ROL POR USUARIO
    // ==================================================
    console.log('\n📍 PASO 3: Limpiar usuarios con múltiples roles');
    console.log('-'.repeat(50));
    
    const usuariosMultiplesRoles = await sql`
      SELECT 
        u.id,
        u.email,
        COUNT(ur.rol_id) as num_roles,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      GROUP BY u.id, u.email
      HAVING COUNT(ur.rol_id) > 1
    `;
    
    for (const usuario of usuariosMultiplesRoles.rows) {
      console.log(`\n   Usuario con múltiples roles: ${usuario.email}`);
      console.log(`   Roles actuales: ${usuario.roles}`);
      
      // Obtener el rol con más permisos
      const mejorRol = await sql`
        SELECT 
          r.id,
          r.nombre,
          COUNT(rp.permiso_id) as num_permisos
        FROM usuarios_roles ur
        JOIN roles r ON r.id = ur.rol_id
        LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
        WHERE ur.usuario_id = ${usuario.id}
        GROUP BY r.id, r.nombre
        ORDER BY num_permisos DESC
        LIMIT 1
      `;
      
      if (mejorRol.rows.length > 0) {
        const rolAMantener = mejorRol.rows[0];
        console.log(`   Manteniendo solo el rol: ${rolAMantener.nombre} (${rolAMantener.num_permisos} permisos)`);
        
        // Eliminar todos los roles
        await sql`
          DELETE FROM usuarios_roles
          WHERE usuario_id = ${usuario.id}
        `;
        
        // Reasignar solo el mejor rol
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${usuario.id}, ${rolAMantener.id})
        `;
        
        console.log(`   ✅ Usuario simplificado a un solo rol`);
      }
    }
    
    // ==================================================
    // PASO 4: CREAR TRIGGER PARA MANTENER UN ROL POR USUARIO
    // ==================================================
    console.log('\n📍 PASO 4: Crear función para mantener un rol por usuario');
    console.log('-'.repeat(50));
    
    // Crear función que elimina roles anteriores al asignar uno nuevo
    await sql`
      CREATE OR REPLACE FUNCTION enforce_single_role()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Eliminar cualquier rol anterior del usuario
        DELETE FROM usuarios_roles
        WHERE usuario_id = NEW.usuario_id
        AND rol_id != NEW.rol_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Crear trigger si no existe
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'enforce_single_role_trigger'
        ) THEN
          CREATE TRIGGER enforce_single_role_trigger
          AFTER INSERT ON usuarios_roles
          FOR EACH ROW
          EXECUTE FUNCTION enforce_single_role();
        END IF;
      END $$;
    `;
    
    console.log('   ✅ Trigger creado para mantener un rol por usuario');
    
    // ==================================================
    // PASO 5: VERIFICACIÓN FINAL
    // ==================================================
    console.log('\n📍 PASO 5: Verificación final');
    console.log('-'.repeat(50));
    
    // Verificar Carlos
    const carlosVerif = await sql`
      SELECT 
        u.email,
        u.activo,
        r.nombre as rol,
        COUNT(p.id) as total_permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      LEFT JOIN permisos p ON p.id = rp.permiso_id
      WHERE LOWER(u.email) = 'carlos.irigoyen@gard.cl'
      GROUP BY u.email, u.activo, r.nombre
    `;
    
    if (carlosVerif.rows.length > 0) {
      const carlos = carlosVerif.rows[0];
      console.log(`\n   ✅ Carlos configurado correctamente:`);
      console.log(`      Email: ${carlos.email}`);
      console.log(`      Rol: ${carlos.rol}`);
      console.log(`      Permisos: ${carlos.total_permisos}`);
    }
    
    // Estadísticas finales
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as usuarios_activos,
        (SELECT COUNT(*) FROM usuarios u 
         JOIN usuarios_roles ur ON ur.usuario_id = u.id
         WHERE u.activo = true) as usuarios_con_roles,
        (SELECT COUNT(*) FROM usuarios u
         JOIN usuarios_roles ur ON ur.usuario_id = u.id
         GROUP BY u.id
         HAVING COUNT(ur.rol_id) > 1) as usuarios_multiples_roles
    `;
    
    const stat = stats.rows[0];
    console.log(`\n   📊 Estadísticas finales:`);
    console.log(`      Usuarios activos: ${stat.usuarios_activos}`);
    console.log(`      Usuarios con roles: ${stat.usuarios_con_roles}`);
    console.log(`      Usuarios con múltiples roles: ${stat.usuarios_multiples_roles || 0}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ REFACTORIZACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(80));
    console.log('\nSistema RBAC refactorizado con las siguientes mejoras:');
    console.log('• Un rol por usuario implementado');
    console.log('• Carlos con rol Super Admin y todos los permisos');
    console.log('• Todos los usuarios activos tienen roles asignados');
    console.log('• Trigger creado para mantener la política de un rol por usuario');
    console.log('\n⚠️ IMPORTANTE: Limpia el caché del navegador para ver los cambios');
    
  } catch (error) {
    console.error('\n❌ Error durante la refactorización:', error);
    throw error;
  }
}

// Ejecutar la refactorización
refactorizarSistemaRBAC()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
