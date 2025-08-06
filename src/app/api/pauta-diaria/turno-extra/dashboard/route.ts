import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '12';
    const instalacionId = searchParams.get('instalacion_id');
    const estado = searchParams.get('estado');

    // Calcular fecha de inicio basada en el período
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - parseInt(periodo));

    console.log('📊 Dashboard - Fecha inicio:', fechaInicio.toISOString().split('T')[0]);
    console.log('📊 Dashboard - Período:', periodo, 'meses');

    // Construir la consulta base
    let queryString = `
      SELECT 
        te.id,
        te.guardia_id,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        te.instalacion_id,
        i.nombre as instalacion_nombre,
        te.puesto_id,
        po.nombre_puesto as nombre_puesto,
        te.fecha,
        te.estado,
        te.valor,
        te.pagado,
        te.fecha_pago,
        te.observaciones_pago,
        te.usuario_pago,
        te.planilla_id,
        te.created_at
      FROM TE_turnos_extras te
      LEFT JOIN guardias g ON te.guardia_id = g.id
      LEFT JOIN instalaciones i ON te.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON po.id = te.puesto_id
      WHERE te.fecha >= $1
    `;

    const params: any[] = [fechaInicio.toISOString().split('T')[0]];

    // Agregar filtros adicionales
    if (instalacionId && instalacionId !== 'all') {
      queryString += ` AND te.instalacion_id = $${params.length + 1}`;
      params.push(instalacionId);
    }

    if (estado && estado !== 'all') {
      queryString += ` AND te.estado = $${params.length + 1}`;
      params.push(estado);
    }

    queryString += ` ORDER BY te.fecha DESC`;

    console.log('🔍 Dashboard Query:', queryString);
    console.log('🔍 Dashboard Params:', params);

    const { rows } = await query(queryString, params);

    console.log('📊 Dashboard - Turnos obtenidos:', rows.length);
    if (rows.length > 0) {
      console.log('📊 Dashboard - Primer turno (ejemplo):', rows[0]);
    }

    return NextResponse.json({
      success: true,
      turnos_extras: rows,
      total: rows.length,
      periodo_meses: parseInt(periodo)
    });

  } catch (error) {
    console.error('❌ Error en dashboard de turnos extras:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 