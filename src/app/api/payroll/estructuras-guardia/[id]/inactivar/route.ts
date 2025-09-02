import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// PUT - Inactivar una estructura de guardia
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

  try {
    const estructuraId = params.id;
    const body = await request.json();
    const { vigencia_hasta } = body;

    console.log('🔍 Inactivar estructura:', { estructuraId, vigencia_hasta });

    if (!estructuraId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID de estructura' },
        { status: 400 }
      );
    }

    if (!vigencia_hasta) {
      return NextResponse.json(
        { success: false, error: 'Se requiere vigencia_hasta' },
        { status: 400 }
      );
    }

    // Inactivar la estructura
    const result = await sql`
      UPDATE sueldo_estructura_guardia 
      SET vigencia_hasta = ${vigencia_hasta}::date, activo = false
      WHERE id = ${estructuraId}
      RETURNING id, guardia_id, vigencia_desde, vigencia_hasta, activo
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al inactivar estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
