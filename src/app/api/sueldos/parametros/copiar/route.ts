import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { copiarParametrosMes } from '@/lib/sueldo/db/parametros';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { origen, destino } = body;

    if (!origen || !destino) {
      return NextResponse.json(
        { success: false, error: 'Origen y destino son requeridos' },
        { status: 400 }
      );
    }

    await copiarParametrosMes(origen, destino);

    return NextResponse.json({
      success: true,
      message: `Parámetros copiados de ${origen} a ${destino} exitosamente`
    });

  } catch (error) {
    console.error('Error copiando parámetros:', error);
    return NextResponse.json(
      { success: false, error: 'Error al copiar parámetros' },
      { status: 500 }
    );
  }
}
