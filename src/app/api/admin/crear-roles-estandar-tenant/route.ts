import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuthz } from '@/lib/authz-api';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthz(request);
    
    // Solo permitir Platform Admins
    if (!ctx.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { tenant_id } = await request.json();
    
    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

    console.log('🔧 CREANDO ROLES ESTÁNDAR PARA TENANT:', tenant_id);

    // Verificar que el tenant existe
    const tenant = await sql`
      SELECT id, nombre FROM tenants WHERE id = ${tenant_id}::uuid
    `;

    if (tenant.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // Crear roles estándar para el tenant
    const roles = [
      { nombre: 'Super Admin', descripcion: 'Administrador del sistema con control total' },
      { nombre: 'Tenant Admin', descripcion: 'Administrador de un tenant específico' },
      { nombre: 'Supervisor', descripcion: 'Supervisor de operaciones' },
      { nombre: 'Perfil Básico', descripcion: 'Usuario operativo básico' }
    ];

    const rolesCreados = [];

    for (const rol of roles) {
      // Crear el rol
      const rolResult = await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id) 
        VALUES (${rol.nombre}, ${rol.descripcion}, ${tenant_id}::uuid)
        RETURNING id, nombre
      `;
      
      const rolCreado = rolResult.rows[0];
      rolesCreados.push(rolCreado);

      // Asignar permisos según el rol
      let permisos = [];
      
      if (rol.nombre === 'Super Admin') {
        permisos = [
          'rbac.platform_admin',
          'rbac.tenants.read', 'rbac.tenants.create', 'rbac.tenants.edit', 'rbac.tenants.delete',
          'rbac.roles.read', 'rbac.roles.create', 'rbac.roles.edit', 'rbac.roles.delete',
          'rbac.permisos.read', 'rbac.permisos.create', 'rbac.permisos.edit', 'rbac.permisos.delete',
          'usuarios.manage',
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
        ];
      } else if (rol.nombre === 'Tenant Admin') {
        permisos = [
          'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
          'roles.view', 'roles.read',
          'permisos.view', 'permisos.read',
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
        ];
      } else if (rol.nombre === 'Supervisor') {
        permisos = [
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
        ];
      } else if (rol.nombre === 'Perfil Básico') {
        permisos = [
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
        ];
      }

      // Asignar permisos al rol
      if (permisos.length > 0) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          SELECT ${rolCreado.id}::uuid, p.id
          FROM permisos p
          WHERE p.clave = ANY(${permisos}::text[])
          ON CONFLICT DO NOTHING
        `;
      }

      console.log(`✅ Rol ${rol.nombre} creado con ${permisos.length} permisos`);
    }

    return NextResponse.json({
      success: true,
      mensaje: `Roles estándar creados para tenant ${tenant.rows[0].nombre}`,
      tenant: tenant.rows[0],
      roles_creados: rolesCreados
    });

  } catch (error) {
    console.error('❌ Error creando roles estándar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
