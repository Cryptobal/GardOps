import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUserRef } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userRef = await getCurrentUserRef();
    if (!userRef) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso de admin RBAC
    const canAdminRbac = await sql`
      SELECT fn_usuario_tiene_permiso(${userRef}, 'rbac.admin') as puede
    `;
    
    if (!canAdminRbac[0]?.puede) {
      return NextResponse.json({ error: 'Sin permisos para administrar seguridad' }, { status: 403 });
    }

    // Obtener todos los permisos
    const permisos = await sql`
      SELECT 
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        'General' as categoria,
        p.created_at,
        (
          SELECT COUNT(DISTINCT rp.rol_codigo)
          FROM rbac_roles_permisos rp
          WHERE rp.permiso_cod = p.codigo
        ) as roles_count
      FROM rbac_permisos p
      ORDER BY p.codigo
    `;

    // Agrupar por categoría
    const permisosPorCategoria = permisos.reduce((acc: any, permiso: any) => {
      const categoria = permiso.categoria || 'Sin categoría';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(permiso);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: permisos,
      byCategory: permisosPorCategoria
    });
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    return NextResponse.json(
      { error: 'Error al obtener permisos' },
      { status: 500 }
    );
  }
}
