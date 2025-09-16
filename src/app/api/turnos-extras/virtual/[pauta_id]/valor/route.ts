import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { pauta_id: string } }
) {
  try {
    const { pauta_id } = params;
    const { valor } = await request.json();

    if (!pauta_id) {
      return NextResponse.json(
        { error: 'pauta_id es requerido' },
        { status: 400 }
      );
    }

    if (valor === undefined || valor === null) {
      return NextResponse.json(
        { error: 'valor es requerido' },
        { status: 400 }
      );
    }

    if (typeof valor !== 'number' || valor < 0) {
      return NextResponse.json(
        { error: 'valor debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Verificar que el turno virtual existe
    const { rows: turnoInfo } = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.guardia_trabajo_id,
        pm.estado_puesto,
        pm.estado_guardia,
        pm.tipo_cobertura,
        pm.meta,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        gc.nombre as cobertura_guardia_nombre,
        gc.apellido_paterno as cobertura_guardia_apellido,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre,
        make_date(pm.anio, pm.mes, pm.dia) as fecha
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN guardias gc ON gc.id = (pm.meta->>'cobertura_guardia_id')::uuid
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.id = $1
    `, [pauta_id]);

    if (turnoInfo.length === 0) {
      return NextResponse.json(
        { error: 'Turno virtual no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoInfo[0];

    // Verificar que es un turno virtual (tiene cobertura)
    if (!turno.meta || !turno.meta.cobertura_guardia_id) {
      return NextResponse.json(
        { error: 'Este no es un turno virtual válido' },
        { status: 400 }
      );
    }

    // Actualizar el valor en la pauta mensual
    // Para turnos virtuales, el valor se almacena en el campo meta
    const metaActualizada = {
      ...turno.meta,
      valor_turno_extra: valor
    };

    await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        meta = $1::jsonb,
        updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(metaActualizada), pauta_id]);

    logger.info(`Valor del turno virtual actualizado: ${pauta_id}. Nuevo valor: $${valor}`);

    return NextResponse.json({
      success: true,
      message: 'Valor del turno virtual actualizado correctamente',
      data: {
        pauta_id,
        guardia_nombre: `${turno.guardia_nombre} ${turno.guardia_apellido_paterno}`,
        cobertura_guardia_nombre: `${turno.cobertura_guardia_nombre} ${turno.cobertura_guardia_apellido}`,
        instalacion_nombre: turno.instalacion_nombre,
        puesto_nombre: turno.puesto_nombre,
        fecha: turno.fecha,
        valor_anterior: turno.meta?.valor_turno_extra || 0,
        valor_nuevo: valor
      }
    });

  } catch (error) {
    logger.error('Error al actualizar valor del turno virtual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
