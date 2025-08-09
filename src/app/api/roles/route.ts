import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const rolesQuery = `
      SELECT 
        r.id,
        r.name AS nombre,
        r.description AS descripcion,
        COALESCE(json_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permisos
      FROM rbac_roles r
      LEFT JOIN rbac_roles_permisos rp ON rp.role_id = r.id
      LEFT JOIN rbac_permisos p ON p.id = rp.permission_id
      GROUP BY r.id, r.name, r.description
      ORDER BY r.name
    `;

    const rolesResult = await query(rolesQuery);
    const roles = Array.isArray(rolesResult) ? rolesResult : (rolesResult.rows || []);

    return NextResponse.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
