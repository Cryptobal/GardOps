import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  try {
    const { id: instalacionId, ppcId } = params;

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT id, instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc
      FROM as_turnos_puestos_operativos
      WHERE id = $1 AND instalacion_id = $2
    `, [ppcId, instalacionId]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Eliminar directamente el puesto operativo
      await query(`
        DELETE FROM as_turnos_puestos_operativos 
        WHERE id = $1
      `, [ppcId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Puesto operativo eliminado correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando puesto operativo:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 