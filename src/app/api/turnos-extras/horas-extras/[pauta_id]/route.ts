import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pauta_id: string } }
) {
  try {
    const { pauta_id } = params;

    if (!pauta_id) {
      return NextResponse.json(
        { error: 'pauta_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener información de las horas extras
    const { rows: horasExtrasInfo } = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.horas_extras,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre,
        make_date(pm.anio, pm.mes, pm.dia) as fecha
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.id = $1 AND pm.horas_extras > 0
    `, [pauta_id]);

    if (horasExtrasInfo.length === 0) {
      return NextResponse.json(
        { error: 'Horas extras no encontradas' },
        { status: 404 }
      );
    }

    const horasExtras = horasExtrasInfo[0];
    const montoEliminado = horasExtras.horas_extras;

    // Eliminar las horas extras (poner en 0)
    await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        horas_extras = 0,
        updated_at = NOW()
      WHERE id = $1
    `, [pauta_id]);

    logger.info(`Horas extras eliminadas para pauta ${pauta_id}. Monto: $${montoEliminado}`);

    return NextResponse.json({
      success: true,
      message: 'Horas extras eliminadas correctamente',
      data: {
        pauta_id,
        guardia_nombre: `${horasExtras.guardia_nombre} ${horasExtras.guardia_apellido_paterno}`,
        instalacion_nombre: horasExtras.instalacion_nombre,
        puesto_nombre: horasExtras.puesto_nombre,
        fecha: horasExtras.fecha,
        monto_eliminado: montoEliminado
      }
    });

  } catch (error) {
    logger.error('Error al eliminar horas extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
