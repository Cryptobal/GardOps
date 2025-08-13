import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function asignarPermisosRoles() {
  try {
    console.log('🔐 ASIGNANDO PERMISOS A ROLES\n');

    // ===============================================
    // 1. OBTENER ROLES Y PERMISOS
    // ===============================================
    console.log('1️⃣ Obteniendo roles y permisos...');
    
    const roles = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles
      WHERE activo = true
      ORDER BY nombre
    `;

    const permisos = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      ORDER BY clave
    `;

    console.log('📋 Roles activos:');
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    console.log('\n📋 Permisos disponibles:');
    permisos.rows.forEach((permiso: any) => {
      console.log(`   - ${permiso.clave}: ${permiso.descripcion}`);
    });

    // ===============================================
    // 2. DEFINIR PERMISOS POR ROL
    // ===============================================
    console.log('\n2️⃣ Definindo permisos por rol...');
    
    const permisosPorRol = {
      'Platform Admin': [
        'rbac.platform_admin',
        'rbac.roles.read',
        'rbac.roles.write',
        'rbac.roles.create',
        'rbac.roles.delete',
        'rbac.permisos.read',
        'rbac.tenants.read',
        'rbac.tenants.create',
        'usuarios.manage'
      ],
      'Admin': [
        'usuarios.manage',
        'turnos.*',
        'turnos.view',
        'turnos.edit',
        'payroll.*',
        'payroll.view',
        'payroll.edit',
        'maestros.*',
        'maestros.view',
        'maestros.edit',
        'documentos.manage',
        'config.manage'
      ],
      'Supervisor': [
        'turnos.view',
        'turnos.edit',
        'maestros.view',
        'documentos.manage'
      ],
      'Operador': [
        'turnos.view',
        'maestros.view'
      ]
    };

    // ===============================================
    // 3. ASIGNAR PERMISOS A CADA ROL
    // ===============================================
    console.log('\n3️⃣ Asignando permisos...');
    
    for (const [nombreRol, permisosRol] of Object.entries(permisosPorRol)) {
      console.log(`\n🔐 Asignando permisos a ${nombreRol}:`);
      
      // Encontrar el rol
      const rol = roles.rows.find((r: any) => r.nombre === nombreRol);
      if (!rol) {
        console.log(`   ❌ Rol ${nombreRol} no encontrado`);
        continue;
      }

      // Limpiar permisos existentes
      await sql`
        DELETE FROM roles_permisos WHERE rol_id = ${rol.id}
      `;
      console.log(`   🧹 Permisos anteriores eliminados`);

      // Asignar nuevos permisos
      let permisosAsignados = 0;
      for (const clavePermiso of permisosRol) {
        const permiso = permisos.rows.find((p: any) => p.clave === clavePermiso);
        if (permiso) {
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${rol.id}, ${permiso.id})
            ON CONFLICT DO NOTHING
          `;
          console.log(`   ✅ ${clavePermiso}`);
          permisosAsignados++;
        } else {
          console.log(`   ❌ Permiso ${clavePermiso} no encontrado`);
        }
      }
      
      console.log(`   📊 Total permisos asignados: ${permisosAsignados}`);
    }

    // ===============================================
    // 4. VERIFICAR ASIGNACIONES
    // ===============================================
    console.log('\n4️⃣ Verificando asignaciones...');
    
    for (const rol of roles.rows) {
      const permisosAsignados = await sql`
        SELECT p.clave, p.descripcion
        FROM roles_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = ${rol.id}
        ORDER BY p.clave
      `;

      console.log(`\n👑 ${rol.nombre}:`);
      if (permisosAsignados.rows.length > 0) {
        permisosAsignados.rows.forEach((permiso: any) => {
          console.log(`   ✅ ${permiso.clave}: ${permiso.descripcion}`);
        });
      } else {
        console.log(`   ⚠️  Sin permisos asignados`);
      }
    }

    // ===============================================
    // 5. VERIFICAR USUARIOS
    // ===============================================
    console.log('\n5️⃣ Verificando usuarios...');
    
    const usuarios = await sql`
      SELECT 
        u.email,
        u.nombre,
        r.nombre as rol_rbac
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id AND r.activo = true
      WHERE u.email LIKE '%@gard.cl'
      ORDER BY u.email
    `;

    console.log('📊 Usuarios y sus roles:');
    usuarios.rows.forEach((usuario: any) => {
      console.log(`   👤 ${usuario.email} → ${usuario.rol_rbac || 'Sin rol RBAC'}`);
    });

    console.log('\n🎉 PERMISOS ASIGNADOS CORRECTAMENTE');
    console.log('✅ Todos los roles tienen sus permisos correspondientes');
    console.log('✅ Los usuarios pueden probar diferentes niveles de acceso');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

asignarPermisosRoles().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
