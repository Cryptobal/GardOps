import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2");
  
  try {
    const instalacionId = params.id;
    const turnoId = params.turnoId;

    // Verificar que el turno existe y pertenece a esta instalación
    const turnoCheck = await sql`
      SELECT po.rol_id, COUNT(*) as total_puestos
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = ${instalacionId} AND po.rol_id = ${turnoId}
      GROUP BY po.rol_id
    `;

    if (turnoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turnoData = turnoCheck.rows[0];

    // Verificar si hay guardias asignados a este turno
    const guardiasAsignados = await sql`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = ${instalacionId} AND po.rol_id = ${turnoId} AND po.guardia_id IS NOT NULL
    `;

    if (parseInt(guardiasAsignados.rows[0].total) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el turno porque tiene guardias asignados' },
        { status: 409 }
      );
    }

    // Eliminar todos los puestos operativos del turno
    const result = await sql`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE instalacion_id = ${instalacionId} AND rol_id = ${turnoId}
      RETURNING id
    `;

    console.log(`✅ Turno ${turnoId} eliminado de instalación ${instalacionId}. Puestos eliminados: ${result.rows.length}`);

    return NextResponse.json({
      success: true,
      message: 'Turno eliminado correctamente',
      puestos_eliminados: result.rows.length
    });

  } catch (error) {
    console.error('Error eliminando turno v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 