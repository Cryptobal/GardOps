import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const rolesQuery = `
      SELECT 
        id,
        name as nombre,
        description as descripcion,
        permissions as permisos
      FROM roles 
      ORDER BY name
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
