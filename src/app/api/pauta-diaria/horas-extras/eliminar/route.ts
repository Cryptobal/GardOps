import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pauta_id = searchParams.get('pauta_id');

    // Validar parámetros
    if (!pauta_id) {
      return NextResponse.json(
        { error: 'pauta_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la pauta existe y tiene horas extras
    const { rows: pautaInfo } = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.horas_extras,
        g.nombre as guardia_nombre,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.id = $1 AND pm.horas_extras > 0
    `, [pauta_id]);

    if (pautaInfo.length === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada o no tiene horas extras' },
        { status: 404 }
      );
    }

    const pauta = pautaInfo[0];

    // Eliminar horas extras (establecer en 0)
    await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        horas_extras = 0,
        updated_at = NOW()
      WHERE id = $1
    `, [pauta_id]);

    logger.info(`Horas extras eliminadas para pauta ${pauta_id}`);

    return NextResponse.json({
      success: true,
      message: 'Horas extras eliminadas correctamente',
      data: {
        pauta_id,
        guardia_nombre: pauta.guardia_nombre,
        instalacion_nombre: pauta.instalacion_nombre,
        puesto_nombre: pauta.puesto_nombre,
        monto_eliminado: pauta.horas_extras
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
