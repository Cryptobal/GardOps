import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { obtenerPeriodosDisponibles } from '@/lib/sueldo/db/parametros';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'read:list' });
if (deny) return deny;

  try {
    const periodos = await obtenerPeriodosDisponibles();

    return NextResponse.json({
      success: true,
      periodos
    });

  } catch (error) {
    console.error('Error obteniendo períodos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener períodos' },
      { status: 500 }
    );
  }
}
