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

    console.log('🔧 ASIGNANDO ROL SUPER ADMIN A CARLOS.IRIGOYEN');

    // 1. Verificar que Carlos.Irigoyen@gard.cl existe
    const carlos = await sql`
      SELECT id, email, rol, tenant_id
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;

    if (carlos.rows.length === 0) {
      return NextResponse.json({ error: 'Carlos.Irigoyen@gard.cl no encontrado' }, { status: 404 });
    }

    // 2. Verificar que el rol Super Admin existe
    const superAdmin = await sql`
      SELECT id, nombre, descripcion
      FROM roles 
      WHERE nombre = 'Super Admin'
    `;

    if (superAdmin.rows.length === 0) {
      return NextResponse.json({ error: 'Rol Super Admin no encontrado' }, { status: 404 });
    }

    // 3. Eliminar cualquier asignación previa de roles para Carlos.Irigoyen@gard.cl
    await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id = ${carlos.rows[0].id}
    `;

    // 4. Asignar el rol Super Admin a Carlos.Irigoyen@gard.cl
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      VALUES (${carlos.rows[0].id}, ${superAdmin.rows[0].id})
    `;

    // 5. Verificar la asignación
    const asignacion = await sql`
      SELECT 
        u.email,
        r.nombre as rol_asignado,
        r.descripcion
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    // 6. Verificar permisos totales de Carlos.Irigoyen@gard.cl
    const permisos = await sql`
      SELECT 
        COUNT(p.id) as total_permisos,
        STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email
    `;

    // 7. Verificar permisos especiales de Carlos.Irigoyen@gard.cl
    const permisosEspeciales = await sql`
      SELECT p.clave, p.descripcion
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
      ORDER BY p.clave
    `;

    return NextResponse.json({
      success: true,
      mensaje: 'Rol Super Admin asignado exitosamente a Carlos.Irigoyen@gard.cl',
      asignacion: asignacion.rows[0],
      permisos: permisos.rows[0] || { total_permisos: 0, permisos: '' },
      permisosEspeciales: permisosEspeciales.rows
    });

  } catch (error) {
    console.error('❌ Error durante la asignación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
