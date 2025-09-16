import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { pauta_id, monto_horas_extras } = await request.json();

    // Validar parámetros
    if (!pauta_id || monto_horas_extras === undefined || monto_horas_extras === null) {
      return NextResponse.json(
        { error: 'pauta_id y monto_horas_extras son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el monto sea un número positivo
    const monto = parseFloat(monto_horas_extras);
    if (isNaN(monto) || monto < 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Verificar que la pauta existe y obtener información del guardia
    const { rows: pautaInfo } = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.instalacion_id,
        pm.puesto_id,
        pm.horas_extras as horas_extras_actuales,
        g.nombre as guardia_nombre,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre,
        rs.nombre as rol_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.id = $1
    `, [pauta_id]);

    if (pautaInfo.length === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    const pauta = pautaInfo[0];

    // Actualizar horas extras en la pauta mensual
    const { rows: updatedPauta } = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        horas_extras = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [monto, pauta_id]);

    // Las horas extras se almacenan directamente en as_turnos_pauta_mensual
    // No necesitamos usar la tabla turnos_extras para este caso

    logger.info(`Horas extras actualizadas para pauta ${pauta_id}: $${monto}`);

    return NextResponse.json({
      success: true,
      message: 'Horas extras guardadas correctamente',
      data: {
        pauta_id,
        monto_horas_extras: monto,
        guardia_nombre: pauta.guardia_nombre,
        instalacion_nombre: pauta.instalacion_nombre,
        puesto_nombre: pauta.puesto_nombre,
        rol_nombre: pauta.rol_nombre,
        fecha: `${pauta.anio}-${String(pauta.mes).padStart(2, '0')}-${String(pauta.dia).padStart(2, '0')}`
      }
    });

  } catch (error) {
    logger.error('Error al guardar horas extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pauta_id = searchParams.get('pauta_id');
    const fecha = searchParams.get('fecha');
    const guardia_id = searchParams.get('guardia_id');

    let query_sql = `
      SELECT 
        pm.id as pauta_id,
        pm.guardia_id,
        pm.fecha,
        pm.horas_extras,
        g.nombre as guardia_nombre,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre,
        rs.nombre as rol_nombre,
        pm.updated_at
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN as_turnos_roles_servicio rs ON pm.rol_id = rs.id
      WHERE pm.horas_extras > 0
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (pauta_id) {
      query_sql += ` AND pm.id = $${paramIndex}`;
      params.push(pauta_id);
      paramIndex++;
    }

    if (fecha) {
      query_sql += ` AND pm.fecha = $${paramIndex}`;
      params.push(fecha);
      paramIndex++;
    }

    if (guardia_id) {
      query_sql += ` AND pm.guardia_id = $${paramIndex}`;
      params.push(guardia_id);
      paramIndex++;
    }

    query_sql += ` ORDER BY pm.fecha DESC, pm.updated_at DESC`;

    const { rows } = await query(query_sql, params);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error) {
    logger.error('Error al obtener horas extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



