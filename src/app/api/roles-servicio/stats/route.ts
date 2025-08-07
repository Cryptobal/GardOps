import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    const query = 'SELECT * FROM get_roles_servicio_stats($1)';
    const result = await sql.query(query, [tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_roles: 0,
          roles_activos: 0,
          roles_inactivos: 0,
          total_estructuras: 0,
          estructuras_activas: 0,
          estructuras_inactivas: 0,
          roles_con_estructura: 0,
          roles_sin_estructura: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de roles de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
