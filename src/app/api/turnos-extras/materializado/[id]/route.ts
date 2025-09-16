import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del turno extra es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el turno extra existe y no está pagado
    const { rows: turnoInfo } = await query(`
      SELECT 
        te.id,
        te.guardia_id,
        te.instalacion_id,
        te.puesto_id,
        te.fecha,
        te.estado,
        te.valor,
        te.pagado,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre
      FROM TE_turnos_extras te
      LEFT JOIN guardias g ON te.guardia_id = g.id
      LEFT JOIN instalaciones i ON te.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON te.puesto_id = po.id
      WHERE te.id = $1
    `, [id]);

    if (turnoInfo.length === 0) {
      return NextResponse.json(
        { error: 'Turno extra no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoInfo[0];

    // Verificar que no esté pagado
    if (turno.pagado) {
      return NextResponse.json(
        { error: 'No se puede eliminar un turno extra que ya está pagado' },
        { status: 400 }
      );
    }

    // Eliminar el turno extra
    await query(`
      DELETE FROM TE_turnos_extras 
      WHERE id = $1
    `, [id]);

    logger.info(`Turno extra materializado eliminado: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Turno extra eliminado correctamente',
      data: {
        id,
        guardia_nombre: `${turno.guardia_nombre} ${turno.guardia_apellido_paterno}`,
        instalacion_nombre: turno.instalacion_nombre,
        puesto_nombre: turno.puesto_nombre,
        fecha: turno.fecha,
        valor: turno.valor
      }
    });

  } catch (error) {
    logger.error('Error al eliminar turno extra materializado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
