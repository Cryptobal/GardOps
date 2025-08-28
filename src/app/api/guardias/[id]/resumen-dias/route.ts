import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { obtenerResumenDiasGuardiaMes } from '@/lib/sueldo/integracion/planillas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'read:list' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const guardiaId = params.id;
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');

    // Validar parámetros
    if (!guardiaId) {
      return NextResponse.json(
        { error: 'ID de guardia requerido' },
        { status: 400 }
      );
    }

    if (!mes || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: 'Mes inválido (debe ser 1-12)' },
        { status: 400 }
      );
    }

    if (!anio || anio < 2020) {
      return NextResponse.json(
        { error: 'Año inválido (debe ser >= 2020)' },
        { status: 400 }
      );
    }

    // Obtener resumen de días
    const resumenDias = await obtenerResumenDiasGuardiaMes(guardiaId, mes, anio);

    return NextResponse.json({
      success: true,
      data: {
        guardiaId,
        periodo: {
          mes,
          anio,
          descripcion: `${mes}/${anio}`
        },
        resumen: resumenDias
      }
    });

  } catch (error) {
    console.error('Error obteniendo resumen de días:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
