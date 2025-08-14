import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { activo, tenantId = '1' } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'El campo activo debe ser un booleano' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM toggle_estructura_sueldo_activo($1, $2, $3)';
    const result = await sql.query(query, [id, activo, tenantId]);

    if (result.rows[0]?.error) {
      return NextResponse.json(
        { success: false, error: result.rows[0].error },
        { status: 400 }
      );
    }

    const action = activo ? 'activada' : 'inactivada';
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Estructura de sueldo ${action} exitosamente`
    });
  } catch (error) {
    console.error('Error al cambiar estado de la estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
