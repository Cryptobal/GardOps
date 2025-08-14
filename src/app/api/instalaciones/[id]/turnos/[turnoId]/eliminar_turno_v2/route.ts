import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  {

 params }: { params: { id: string; turnoId: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2");
  
  try {
    const instalacionId = params.id;
    const turnoId = params.turnoId;

    // Verificar que el turno existe y pertenece a esta instalación
    const turnoCheck = await query(`
      SELECT po.rol_id, COUNT(*) as total_puestos
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.rol_id = $2
      GROUP BY po.rol_id
    `, [instalacionId, turnoId]);

    if (turnoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turnoData = turnoCheck.rows[0];

    // Verificar si hay guardias asignados a este turno
    const guardiasAsignados = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.rol_id = $2 AND po.guardia_id IS NOT NULL
    `, [instalacionId, turnoId]);

    if (parseInt(guardiasAsignados.rows[0].total) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el turno porque tiene guardias asignados' },
        { status: 409 }
      );
    }

    // Eliminar todos los puestos operativos del turno
    const result = await query(`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE instalacion_id = $1 AND rol_id = $2
      RETURNING id
    `, [instalacionId, turnoId]);

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