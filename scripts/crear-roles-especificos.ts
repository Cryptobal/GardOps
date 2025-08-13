#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function crearRolesEspecificos() {
  try {
    console.log('🎯 Creando roles específicos con permisos bien definidos...\n');

    // Obtener tenant por defecto
    const tenantResult = await sql`
      SELECT id FROM tenants LIMIT 1
    `;
    const defaultTenantId = tenantResult.rows[0]?.id;

    // Definir roles específicos
    const rolesEspecificos = [
      {
        nombre: 'Platform Admin (Global)',
        descripcion: 'Administrador de toda la plataforma multi-tenant. Puede crear tenants, gestionar usuarios globales y administrar toda la plataforma.',
        tenant_id: null, // Global
        permisos: [
          'rbac.platform_admin',
          'rbac.tenants.create',
          'rbac.tenants.read',
          'rbac.tenants.write',
          'rbac.roles.create',
          'rbac.roles.read',
          'rbac.roles.write',
          'rbac.roles.delete',
          'rbac.permisos.read',
          'rbac.permisos.write',
          'usuarios.manage',
          'config.manage',
          'config.system',
          'config.backup',
          'auditoria.*',
          'auditoria.logs',
          'auditoria.export'
        ]
      },
      {
        nombre: 'Tenant Admin (Tenant)',
        descripcion: 'Administrador de un tenant específico. Gestiona usuarios, roles y tiene acceso completo a todos los módulos del tenant.',
        tenant_id: defaultTenantId,
        permisos: [
          'usuarios.manage',
          'rbac.roles.create',
          'rbac.roles.read',
          'rbac.roles.write',
          'rbac.roles.delete',
          'rbac.permisos.read',
          'rbac.permisos.write',
          'config.manage',
          'config.tenant',
          'documentos.manage',
          'clientes.*',
          'instalaciones.*',
          'guardias.*',
          'turnos.*',
          'pauta-diaria.*',
          'pauta-mensual.*',
          'payroll.*',
          'maestros.*',
          'reportes.*'
        ]
      },
      {
        nombre: 'User Manager (Tenant)',
        descripcion: 'Gestiona usuarios y roles dentro del tenant. Puede crear, editar y asignar roles a usuarios.',
        tenant_id: defaultTenantId,
        permisos: [
          'usuarios.manage',
          'rbac.roles.read',
          'rbac.roles.write',
          'rbac.permisos.read'
        ]
      },
      {
        nombre: 'Security Manager (Tenant)',
        descripcion: 'Gestiona seguridad y configuración del tenant. Controla documentos, auditoría y configuraciones de seguridad.',
        tenant_id: defaultTenantId,
        permisos: [
          'config.manage',
          'config.tenant',
          'documentos.manage',
          'documentos.*',
          'auditoria.logs',
          'auditoria.export'
        ]
      },
      {
        nombre: 'Operations Manager (Tenant)',
        descripcion: 'Gestiona operaciones diarias. Controla turnos, pautas, asistencia y reportes operativos.',
        tenant_id: defaultTenantId,
        permisos: [
          'turnos.*',
          'pauta-diaria.*',
          'pauta-mensual.*',
          'reportes.*',
          'reportes.asistencia',
          'reportes.turnos',
          'reportes.export'
        ]
      },
      {
        nombre: 'Payroll Manager (Tenant)',
        descripcion: 'Gestiona nómina y sueldos. Controla toda la información relacionada con pagos y reportes de nómina.',
        tenant_id: defaultTenantId,
        permisos: [
          'payroll.*',
          'reportes.payroll',
          'reportes.export'
        ]
      },
      {
        nombre: 'Data Manager (Tenant)',
        descripcion: 'Gestiona datos maestros del sistema. Controla clientes, instalaciones, guardias y otros datos base.',
        tenant_id: defaultTenantId,
        permisos: [
          'maestros.*',
          'clientes.*',
          'instalaciones.*',
          'guardias.*'
        ]
      },
      {
        nombre: 'Supervisor (Tenant)',
        descripcion: 'Supervisor operativo. Puede ver y editar turnos, marcar asistencia y gestionar reemplazos.',
        tenant_id: defaultTenantId,
        permisos: [
          'turnos.view',
          'turnos.edit',
          'pauta-diaria.view',
          'pauta-diaria.edit',
          'pauta-diaria.reemplazos',
          'pauta-mensual.view',
          'pauta-mensual.edit',
          'clientes.view',
          'instalaciones.view',
          'guardias.view',
          'reportes.asistencia',
          'reportes.turnos'
        ]
      },
      {
        nombre: 'Operator (Tenant)',
        descripcion: 'Operador básico. Puede ver información y marcar asistencia básica.',
        tenant_id: defaultTenantId,
        permisos: [
          'turnos.view',
          'pauta-diaria.view',
          'pauta-diaria.edit',
          'pauta-mensual.view',
          'clientes.view',
          'instalaciones.view',
          'guardias.view',
          'reportes.asistencia'
        ]
      },
      {
        nombre: 'Viewer (Tenant)',
        descripcion: 'Solo consulta información. Puede ver todos los datos pero no modificarlos.',
        tenant_id: defaultTenantId,
        permisos: [
          'turnos.view',
          'pauta-diaria.view',
          'pauta-mensual.view',
          'clientes.view',
          'instalaciones.view',
          'guardias.view',
          'payroll.view',
          'maestros.view',
          'documentos.view',
          'reportes.asistencia',
          'reportes.turnos',
          'reportes.payroll'
        ]
      }
    ];

    console.log('📋 Creando roles específicos...\n');

    for (const rolData of rolesEspecificos) {
      try {
        console.log(`🎯 Creando rol: ${rolData.nombre}`);
        console.log(`   📝 Descripción: ${rolData.descripcion}`);
        console.log(`   🏢 Tipo: ${rolData.tenant_id ? 'Tenant' : 'Global'}`);

        // Verificar si el rol ya existe
        const rolExistente = await sql`
          SELECT id FROM roles 
          WHERE nombre = ${rolData.nombre}
        `;

        let rolId: string;

        if (rolExistente.rows.length > 0) {
          // Actualizar rol existente
          rolId = rolExistente.rows[0].id;
          await sql`
            UPDATE roles 
            SET descripcion = ${rolData.descripcion}
            WHERE id = ${rolId}
          `;
          console.log(`   ✅ Rol actualizado`);
        } else {
          // Crear nuevo rol
          const nuevoRol = await sql`
            INSERT INTO roles (nombre, descripcion, tenant_id)
            VALUES (${rolData.nombre}, ${rolData.descripcion}, ${rolData.tenant_id})
            RETURNING id
          `;
          rolId = nuevoRol.rows[0].id;
          console.log(`   ✅ Rol creado`);
        }

        // Eliminar permisos existentes del rol
        await sql`
          DELETE FROM roles_permisos WHERE rol_id = ${rolId}
        `;

        // Asignar permisos al rol
        console.log(`   🔐 Asignando ${rolData.permisos.length} permisos...`);
        for (const permisoClave of rolData.permisos) {
          try {
            // Buscar el permiso
            const permiso = await sql`
              SELECT id FROM permisos WHERE clave = ${permisoClave}
            `;

            if (permiso.rows.length > 0) {
              await sql`
                INSERT INTO roles_permisos (rol_id, permiso_id)
                VALUES (${rolId}, ${permiso.rows[0].id})
                ON CONFLICT DO NOTHING
              `;
              console.log(`      ✅ ${permisoClave}`);
            } else {
              console.log(`      ⚠️  Permiso no encontrado: ${permisoClave}`);
            }
          } catch (error: any) {
            console.log(`      ❌ Error con permiso ${permisoClave}: ${error.message}`);
          }
        }

        console.log('');

      } catch (error: any) {
        console.log(`❌ Error creando rol ${rolData.nombre}: ${error.message}\n`);
      }
    }

    // Verificar que Platform Admin tenga todos los permisos necesarios
    console.log('🔍 Verificando permisos del Platform Admin...');
    const platformAdmin = await sql`
      SELECT id FROM roles WHERE nombre = 'Platform Admin (Global)'
    `;

    if (platformAdmin.rows.length > 0) {
      const permisosNecesarios = [
        'rbac.platform_admin',
        'rbac.tenants.create',
        'rbac.tenants.read',
        'rbac.tenants.write',
        'rbac.roles.create',
        'rbac.roles.read',
        'rbac.roles.write',
        'rbac.roles.delete',
        'rbac.permisos.read',
        'rbac.permisos.write',
        'usuarios.manage',
        'config.manage'
      ];

      for (const permisoClave of permisosNecesarios) {
        const permiso = await sql`
          SELECT id FROM permisos WHERE clave = ${permisoClave}
        `;

        if (permiso.rows.length > 0) {
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${platformAdmin.rows[0].id}, ${permiso.rows[0].id})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    console.log('🎉 Roles específicos creados exitosamente');
    console.log('✅ Cada rol tiene permisos bien definidos y descripciones claras');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearRolesEspecificos().then(() => {
  console.log('\n🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
