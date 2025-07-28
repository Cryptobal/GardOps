import { NextRequest, NextResponse } from 'next/server';
import { obtenerComunas } from '../../../../lib/api/instalaciones';

// GET /api/instalaciones/comunas - Obtener comunas únicas de instalaciones
export async function GET(request: NextRequest) {
  try {
    const comunas = await obtenerComunas();
    return NextResponse.json({ success: true, data: comunas });
  } catch (error) {
    console.error('❌ Error obteniendo comunas de instalaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener comunas' },
      { status: 500 }
    );
  }
}