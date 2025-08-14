import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const guardia_id = searchParams.get('guardia_id');

    if (!guardia_id) {
      return NextResponse.json(
        { error: 'Falta parámetro requerido: guardia_id' },
        { status: 400 }
      );
    }

    // Obtener historial de estructuras personales
    const historialResult = await sql`
      SELECT g.id, g.vigencia_desde, g.vigencia_hasta, COUNT(gi.id) AS n_items
      FROM sueldo_estructura_guardia g
      LEFT JOIN sueldo_estructura_guardia_item gi
        ON gi.estructura_guardia_id = g.id AND gi.activo = TRUE
      WHERE g.guardia_id = ${guardia_id}
      GROUP BY g.id, g.vigencia_desde, g.vigencia_hasta
      ORDER BY g.vigencia_desde DESC;
    `;

    return NextResponse.json({
      historial: historialResult.rows
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
