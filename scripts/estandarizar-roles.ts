#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';

// Definir roles estándar (solo estos 4)
const ROLES_ESTANDAR = {
  'Super Admin': {
    descripcion: 'Administrador del sistema con control total',
    permisos: [
      // Permisos especiales del sistema
      'rbac.platform_admin',
      'rbac.tenants.read',
      'rbac.tenants.create',
      'rbac.tenants.edit',
      'rbac.tenants.delete',
      'rbac.roles.read',
      'rbac.roles.create',
      'rbac.roles.edit',
      'rbac.roles.delete',
      'rbac.permisos.read',
      'rbac.permisos.create',
      'rbac.permisos.edit',
      'rbac.permisos.delete',
      'usuarios.manage',
      // Todos los permisos básicos
      'home.view', 'home.create', 'home.edit', 'home.delete',
      'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
      'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
      'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
      'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
      'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
      'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
      'configuracion.view', 'configuracion.create', 'configuracion.edit', 'configuracion.delete',
      'documentos.view', 'documentos.create', 'documentos.edit', 'documentos.delete',
      'alertas.view', 'alertas.create', 'alertas.edit', 'alertas.delete',
      'asignaciones.view', 'asignaciones.create', 'asignaciones.edit', 'asignaciones.delete',
      'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
      'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
      'permisos.view', 'permisos.create', 'permisos.edit', 'permisos.delete',
      'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
      'ppc.view', 'ppc.create', 'ppc.edit', 'ppc.delete',
      'estructuras.view', 'estructuras.create', 'estructuras.edit', 'estructuras.delete',
      'sueldos.view', 'sueldos.create', 'sueldos.edit', 'sueldos.delete',
      'planillas.view', 'planillas.create', 'planillas.edit', 'planillas.delete',
      'logs.view', 'logs.create', 'logs.edit', 'logs.delete'
    ]
  },
  'Tenant Admin': {
    descripcion: 'Administrador de un tenant específico',
    permisos: [
      // Gestión de usuarios del tenant
      'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
      'roles.view', 'roles.read',
      'permisos.view', 'permisos.read',
      // Todos los permisos básicos de operación
      'home.view', 'home.create', 'home.edit', 'home.delete',
      'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
      'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
      'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
      'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
      'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
      'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
      'configuracion.view', 'configuracion.create', 'configuracion.edit', 'configuracion.delete',
      'documentos.view', 'documentos.create', 'documentos.edit', 'documentos.delete',
      'alertas.view', 'alertas.create', 'alertas.edit', 'alertas.delete',
      'asignaciones.view', 'asignaciones.create', 'asignaciones.edit', 'asignaciones.delete',
      'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
      'ppc.view', 'ppc.create', 'ppc.edit', 'ppc.delete',
      'estructuras.view', 'estructuras.create', 'estructuras.edit', 'estructuras.delete',
      'sueldos.view', 'sueldos.create', 'sueldos.edit', 'sueldos.delete',
      'planillas.view', 'planillas.create', 'planillas.edit', 'planillas.delete',
      'logs.view', 'logs.create', 'logs.edit', 'logs.delete'
    ]
  },
  'Supervisor': {
    descripcion: 'Supervisor de operaciones',
    permisos: [
      'home.view',
      'clientes.view', 'clientes.edit',
      'instalaciones.view', 'instalaciones.edit',
      'guardias.view', 'guardias.edit',
      'pauta_mensual.view', 'pauta_mensual.edit',
      'pauta_diaria.view', 'pauta_diaria.edit',
      'payroll.view', 'payroll.edit',
      'configuracion.view',
      'documentos.view', 'documentos.edit',
      'alertas.view', 'alertas.edit',
      'asignaciones.view', 'asignaciones.edit',
      'turnos_extras.view', 'turnos_extras.edit',
      'ppc.view', 'ppc.edit',
      'estructuras.view', 'estructuras.edit',
      'sueldos.view', 'sueldos.edit',
      'planillas.view', 'planillas.edit',
      'logs.view'
    ]
  },
  'Perfil Básico': {
    descripcion: 'Usuario operativo básico',
    permisos: [
      'home.view',
      'clientes.view',
      'instalaciones.view',
      'guardias.view',
      'pauta_mensual.view',
      'pauta_diaria.view',
      'documentos.view',
      'alertas.view',
      'asignaciones.view',
      'turnos_extras.view',
      'logs.view'
    ]
  }
};

async function estandarizarRoles() {
  try {
    console.log('🔧 ESTANDARIZANDO ROLES (Solo 4 roles estándar)');
    console.log('================================================\n');

    // 1. Obtener permisos existentes
    console.log('📋 1. OBTENIENDO PERMISOS EXISTENTES...');
    const permisosResult = await sql`
      SELECT id, clave FROM permisos
    `;
    const permisosExistentes = new Map(permisosResult.rows.map(p => [p.clave, p.id]));
    console.log(`   Total de permisos encontrados: ${permisosExistentes.size}\n`);

    // 2. ELIMINAR roles no estándar
    console.log('🗑️  2. ELIMINANDO ROLES NO ESTÁNDAR...');
    const rolesEstandarizados = Object.keys(ROLES_ESTANDAR);
    
    // Obtener roles existentes
    const rolesExistentes = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      ORDER BY nombre
    `;

    const rolesAEliminar = rolesExistentes.rows.filter(r => !rolesEstandarizados.includes(r.nombre));
    
    if (rolesAEliminar.length > 0) {
      console.log(`   📝 Roles que se eliminarán: ${rolesAEliminar.length}`);
      rolesAEliminar.forEach(rol => {
        console.log(`      ❌ ${rol.nombre} (ID: ${rol.id})`);
      });

      // Eliminar permisos de roles no estándar
      for (const rol of rolesAEliminar) {
        await sql`
          DELETE FROM roles_permisos 
          WHERE rol_id = ${rol.id}
        `;
        console.log(`   🧹 Permisos eliminados de ${rol.nombre}`);
      }

      // Eliminar asignaciones de usuarios a roles no estándar
      for (const rol of rolesAEliminar) {
        await sql`
          DELETE FROM usuarios_roles 
          WHERE rol_id = ${rol.id}
        `;
        console.log(`   👥 Asignaciones de usuarios eliminadas de ${rol.nombre}`);
      }

      // Eliminar roles no estándar
      for (const rol of rolesAEliminar) {
        await sql`
          DELETE FROM roles 
          WHERE id = ${rol.id}
        `;
        console.log(`   🗑️  Rol ${rol.nombre} eliminado`);
      }
    } else {
      console.log('   ✅ No hay roles no estándar para eliminar');
    }

    // 3. Crear o actualizar roles estándar
    console.log('\n👥 3. CREANDO/ACTUALIZANDO ROLES ESTÁNDAR...');
    const rolesCreados: Record<string, any> = {};

    for (const [nombreRol, config] of Object.entries(ROLES_ESTANDAR)) {
      console.log(`\n🏷️  Procesando rol: ${nombreRol}`);
      
      // Crear o actualizar el rol
      const rolResult = await sql`
        INSERT INTO roles (nombre, descripcion)
        VALUES (${nombreRol}, ${config.descripcion})
        ON CONFLICT (nombre) 
        DO UPDATE SET descripcion = EXCLUDED.descripcion
        RETURNING id, nombre
      `;
      
      const rol = rolResult.rows[0];
      rolesCreados[nombreRol] = rol;
      console.log(`   ✅ Rol ${nombreRol} (ID: ${rol.id}) creado/actualizado`);

      // Limpiar permisos existentes del rol
      await sql`
        DELETE FROM roles_permisos 
        WHERE rol_id = ${rol.id}
      `;
      console.log(`   🧹 Permisos anteriores eliminados`);

      // Asignar nuevos permisos
      let permisosAsignados = 0;
      for (const permisoClave of config.permisos) {
        const permisoId = permisosExistentes.get(permisoClave);
        if (permisoId) {
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${rol.id}, ${permisoId})
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
          `;
          permisosAsignados++;
        } else {
          console.log(`   ⚠️  Permiso no encontrado: ${permisoClave}`);
        }
      }
      console.log(`   ✅ ${permisosAsignados} permisos asignados`);
    }

    // 4. Verificar resultado final
    console.log('\n🔍 4. VERIFICANDO RESULTADO FINAL...');
    const rolesFinales = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      ORDER BY nombre
    `;

    console.log(`\n📊 ROLES FINALES (${rolesFinales.rows.length} roles):`);
    rolesFinales.rows.forEach(rol => {
      console.log(`   ✅ ${rol.nombre} (ID: ${rol.id}) - ${rol.descripcion}`);
    });

    // 5. Resumen final
    console.log('\n📈 5. RESUMEN FINAL:');
    console.log('====================');
    console.log(`   ✅ Roles estándar creados: ${Object.keys(ROLES_ESTANDAR).length}`);
    console.log(`   🗑️  Roles no estándar eliminados: ${rolesAEliminar.length}`);
    
    for (const [nombreRol, config] of Object.entries(ROLES_ESTANDAR)) {
      const rol = rolesCreados[nombreRol];
      console.log(`\n   🏷️  ${nombreRol}:`);
      console.log(`      ID: ${rol.id}`);
      console.log(`      Permisos: ${config.permisos.length}`);
      console.log(`      Descripción: ${config.descripcion}`);
    }

    console.log('\n🎉 ¡Roles estandarizados exitosamente!');
    console.log('💡 Ahora solo existen los 4 roles estándar: Super Admin, Tenant Admin, Supervisor, Perfil Básico');

  } catch (error) {
    console.error('❌ Error durante la estandarización:', error);
  }
}

estandarizarRoles();
