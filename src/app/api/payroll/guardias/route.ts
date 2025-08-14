import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener guardias por instalación
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');

    if (!instalacionId) {
      return NextResponse.json(
        { error: 'Se requiere instalacion_id' },
        { status: 400 }
      );
    }

    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.telefono,
        g.email,
        g.activo,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as nombre_completo
      FROM guardias g
      WHERE g.instalacion_id = $1 AND g.activo = true
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
    `, [instalacionId]);

    return NextResponse.json({ data: result.rows });

  } catch (error) {
    console.error('Error al obtener guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
