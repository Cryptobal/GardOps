import { NextRequest, NextResponse } from 'next/server';
import { copiarParametrosMes } from '@/lib/sueldo/db/parametros';

export async function POST(request: NextRequest) {
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
