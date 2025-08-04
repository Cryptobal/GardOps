import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Obteniendo guardias disponibles para reemplazos');
    
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const instalacionId = searchParams.get('instalacionId');

    // Obtener guardias activos que no estén asignados en la fecha especificada
    let sqlQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.activo
      FROM guardias g
      WHERE g.activo = true 
    `;

    const params: any[] = [];

    if (fecha) {
      // Excluir guardias que ya tienen turno en esa fecha
      sqlQuery += `
        AND g.id NOT IN (
          SELECT DISTINCT pm.guardia_id
          FROM as_turnos_pauta_mensual pm
          WHERE pm.anio = EXTRACT(YEAR FROM $1::date)
            AND pm.mes = EXTRACT(MONTH FROM $1::date)
            AND pm.dia = EXTRACT(DAY FROM $1::date)
            AND pm.guardia_id IS NOT NULL
        )
      `;
      params.push(fecha);
    }

    if (instalacionId) {
      // Opcional: filtrar por instalación si se especifica
      sqlQuery += `
        AND g.id IN (
          SELECT DISTINCT g2.id
          FROM guardias g2
          INNER JOIN as_turnos_pauta_mensual pm ON g2.id = pm.guardia_id
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          WHERE po.instalacion_id = $${params.length + 1}
        )
      `;
      params.push(instalacionId);
    }

    sqlQuery += ` ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno`;

    const guardias = await query(sqlQuery, params);

    console.log(`📊 Guardias disponibles: ${guardias.rows.length}`);

    return NextResponse.json(guardias.rows);

  } catch (error) {
    console.error('❌ Error obteniendo guardias disponibles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 