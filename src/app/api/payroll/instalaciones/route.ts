import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener instalaciones activas
export async function GET(request: NextRequest) {
const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    // Obtener todas las instalaciones activas
    const instalacionesQuery = `
      SELECT 
        id,
        nombre,
        direccion,
        estado
      FROM instalaciones
      WHERE estado = 'Activo'
      ORDER BY nombre
    `;

    const result = await query(instalacionesQuery);

    return NextResponse.json({ data: result.rows });

  } catch (error) {
    console.error('Error al obtener instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
