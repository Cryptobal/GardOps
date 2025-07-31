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
      SELECT id, rol_servicio_id, cantidad_guardias 
      FROM turnos_instalacion 
      WHERE id = $1 AND instalacion_id = $2
    `, [turnoId, instalacionId]);

    if (turnoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoResult.rows[0];

    // Eliminar en orden: asignaciones -> requisitos_puesto -> puestos_por_cubrir -> turno
    await query('BEGIN');

    try {
      // 1. Eliminar asignaciones de guardias (usando requisito_puesto_id)
      await query(`
        DELETE FROM asignaciones_guardias 
        WHERE requisito_puesto_id IN (
          SELECT id FROM requisitos_puesto 
          WHERE rol_servicio_id = $1 AND instalacion_id = $2
        )
      `, [turno.rol_servicio_id, instalacionId]);

      // 2. Obtener requisitos_puesto asociados al turno
      const requisitosResult = await query(`
        SELECT id FROM requisitos_puesto 
        WHERE rol_servicio_id = $1 AND instalacion_id = $2
      `, [turno.rol_servicio_id, instalacionId]);

      const requisitosIds = requisitosResult.rows.map((r: { id: string }) => r.id);

      if (requisitosIds.length > 0) {
        // 3. Eliminar puestos_por_cubrir asociados a estos requisitos
        await query(`
          DELETE FROM puestos_por_cubrir 
          WHERE requisito_puesto_id = ANY($1)
        `, [requisitosIds]);

        // 4. Eliminar requisitos_puesto
        await query(`
          DELETE FROM requisitos_puesto 
          WHERE id = ANY($1)
        `, [requisitosIds]);
      }

      // 5. Finalmente eliminar el turno
      await query(`
        DELETE FROM turnos_instalacion 
        WHERE id = $1
      `, [turnoId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Turno eliminado correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando turno:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 