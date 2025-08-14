import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  try {
    // Esta tabla ya no se usa, retornar vacío
    // TODO: Eliminar este endpoint cuando se actualice el frontend
    console.warn('⚠️ Endpoint deprecado: pagos_turnos_extras ya no se usa');
    
    return NextResponse.json({
      success: true,
      pagos: [],
      mensaje: 'La tabla pagos_turnos_extras ha sido deprecada. Use planillas_turnos_extras en su lugar.'
    });
  } catch (error) {
    console.error('Error obteniendo pagos de turnos extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 