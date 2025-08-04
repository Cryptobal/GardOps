import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const instalacionId = searchParams.get('instalacionId');

    // Consulta para obtener guardias activos con información de instalación actual
    let sqlQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.activo,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        po.instalacion_id as instalacion_actual_id,
        i.nombre as instalacion_actual_nombre
      FROM guardias g
      LEFT JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE g.activo = true 
    `;

    const params: any[] = [];

    if (fecha) {
      // Excluir guardias que ya tienen turno en esa fecha específica
      sqlQuery += `
        AND g.id NOT IN (
          SELECT DISTINCT pm2.guardia_id
          FROM as_turnos_pauta_mensual pm2
          WHERE pm2.anio = EXTRACT(YEAR FROM $1::date)
            AND pm2.mes = EXTRACT(MONTH FROM $1::date)
            AND pm2.dia = EXTRACT(DAY FROM $1::date)
            AND pm2.guardia_id IS NOT NULL
        )
      `;
      params.push(fecha);
    }

    sqlQuery += ` ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno`;

    const guardias = await query(sqlQuery, params);

    return NextResponse.json(guardias.rows);

  } catch (error) {
    console.error('❌ Error obteniendo guardias disponibles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 