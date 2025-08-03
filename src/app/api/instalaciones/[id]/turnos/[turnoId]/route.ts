import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  try {
    const { id: instalacionId, turnoId } = params;

    // Verificar que el turno existe y pertenece a la instalación
    const turnoResult = await query(`
      SELECT rol_id, COUNT(*) as total_puestos
      FROM as_turnos_puestos_operativos 
      WHERE rol_id = $1 AND instalacion_id = $2
      GROUP BY rol_id
    `, [turnoId, instalacionId]);

    if (turnoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoResult.rows[0];

    // Eliminar en orden: asignaciones -> puestos_operativos
    await query('BEGIN');

    try {
      // 1. Eliminar asignaciones de guardias (usando requisito_puesto_id)
      await query(`
        DELETE FROM as_turnos_asignaciones 
        WHERE requisito_puesto_id IN (
          SELECT id FROM as_turnos_requisitos 
          WHERE rol_servicio_id = $1 AND instalacion_id = $2
        )
      `, [turno.rol_id, instalacionId]);

      // 2. Eliminar puestos operativos del turno
      await query(`
        DELETE FROM as_turnos_puestos_operativos 
        WHERE rol_id = $1 AND instalacion_id = $2
      `, [turnoId, instalacionId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Todos los puestos del turno eliminados correctamente',
        puestos_eliminados: parseInt(turno.total_puestos) || 0
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando puestos del turno:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 