import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener instalaciones activas
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        direccion,
        ciudad,
        comuna,
        estado
      FROM instalaciones 
      WHERE estado = 'Activo'
      ORDER BY nombre
    `);

    return NextResponse.json({ data: result.rows });

  } catch (error) {
    console.error('Error al obtener instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
