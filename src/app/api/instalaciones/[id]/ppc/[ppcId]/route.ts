import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  try {
    const { id: instalacionId, ppcId } = params;

    // Verificar que el PPC existe y pertenece a esta instalación
    const ppcCheck = await query(`
      SELECT ppc.id, ppc.requisito_puesto_id, ppc.guardia_asignado_id
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE ppc.id = $1 AND tr.instalacion_id = $2
    `, [ppcId, instalacionId]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado' },
        { status: 404 }
      );
    }

    const ppc = ppcCheck.rows[0];

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Si hay un guardia asignado, eliminar la asignación primero
      if (ppc.guardia_asignado_id) {
        await query(`
          DELETE FROM as_turnos_asignaciones 
          WHERE guardia_id = $1 AND requisito_puesto_id = $2
        `, [ppc.guardia_asignado_id, ppc.requisito_puesto_id]);
      }

      // En lugar de eliminar el PPC completo, reducir cantidad_faltante
      const ppcActual = await query(`
        SELECT cantidad_faltante FROM as_turnos_ppc WHERE id = $1
      `, [ppcId]);

      if (ppcActual.rows.length > 0) {
        const cantidadActual = ppcActual.rows[0].cantidad_faltante;
        
        if (cantidadActual > 1) {
          // Reducir cantidad_faltante en 1
          await query(`
            UPDATE as_turnos_ppc 
            SET cantidad_faltante = cantidad_faltante - 1,
                updated_at = NOW()
            WHERE id = $1
          `, [ppcId]);
          
          // Actualizar cantidad de guardias en el turno
          await query(`
            UPDATE as_turnos_configuracion 
            SET cantidad_guardias = cantidad_guardias - 1,
                updated_at = NOW()
            WHERE instalacion_id = $1 AND rol_servicio_id = (
              SELECT tr.rol_servicio_id 
              FROM as_turnos_requisitos tr 
              WHERE tr.id = $2
            )
          `, [instalacionId, ppc.requisito_puesto_id]);
        } else {
          // Si solo queda 1, eliminar el PPC completo
          await query(`
            DELETE FROM as_turnos_ppc 
            WHERE id = $1
          `, [ppcId]);
          
          // Actualizar cantidad de guardias en el turno
          await query(`
            UPDATE as_turnos_configuracion 
            SET cantidad_guardias = cantidad_guardias - 1,
                updated_at = NOW()
            WHERE instalacion_id = $1 AND rol_servicio_id = (
              SELECT tr.rol_servicio_id 
              FROM as_turnos_requisitos tr 
              WHERE tr.id = $2
            )
          `, [instalacionId, ppc.requisito_puesto_id]);
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'PPC eliminado correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando PPC:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 