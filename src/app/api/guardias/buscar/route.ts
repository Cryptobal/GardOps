import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const instalacionId = searchParams.get('instalacion_id');
    const fecha = searchParams.get('fecha');

    console.log('🔍 Buscando guardias:', { search, instalacionId, fecha });

    let whereConditions = ['g.activo = true'];
    let params: any[] = [];
    let paramIndex = 1;

    // Filtro de búsqueda por nombre o RUT
    if (search.trim()) {
      whereConditions.push(`(
        LOWER(g.nombre) LIKE LOWER($${paramIndex}) OR 
        LOWER(g.apellido_paterno) LIKE LOWER($${paramIndex}) OR 
        LOWER(g.apellido_materno) LIKE LOWER($${paramIndex}) OR 
        LOWER(g.rut) LIKE LOWER($${paramIndex}) OR
        LOWER(CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, ''))) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por instalación si se especifica
    if (instalacionId) {
      whereConditions.push(`g.instalacion_id = $${paramIndex}`);
      params.push(instalacionId);
      paramIndex++;
    }

    // Filtro por fecha para verificar disponibilidad
    let fechaParams = [];
    if (fecha) {
      const fechaObj = new Date(fecha + 'T00:00:00.000Z');
      const anio = fechaObj.getUTCFullYear();
      const mes = fechaObj.getUTCMonth() + 1;
      const dia = fechaObj.getUTCDate();

      // En la pauta diaria, permitimos asignar guardias incluso si ya tienen turno
      // porque pueden hacer turnos extras. Solo marcamos para información.
      fechaParams = [anio, mes, dia];
      params.push(...fechaParams);
    }

    const whereClause = whereConditions.join(' AND ');

    // Construir la consulta SQL dinámicamente según si hay fecha o no
    let sqlQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.activo,
        g.instalacion_id,
        i.nombre as instalacion_nombre,
        CASE 
          WHEN pm.guardia_id IS NOT NULL THEN true 
          ELSE false 
        END as tiene_turno_asignado
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
    `;

    if (fecha && fechaParams.length === 3) {
      sqlQuery += `
        LEFT JOIN (
          SELECT DISTINCT guardia_id 
          FROM as_turnos_pauta_mensual 
          WHERE anio = $${params.length - 2} AND mes = $${params.length - 1} AND dia = $${params.length}
          AND guardia_id IS NOT NULL
        ) pm ON g.id = pm.guardia_id
      `;
    } else {
      sqlQuery += `
        LEFT JOIN (
          SELECT DISTINCT guardia_id 
          FROM as_turnos_pauta_mensual 
          WHERE 1=0
        ) pm ON g.id = pm.guardia_id
      `;
    }

    sqlQuery += `
      WHERE ${whereClause}
      ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
      LIMIT 20
    `;

    const result = await query(sqlQuery, params);

    console.log(`✅ Encontrados ${result.rows.length} guardias disponibles`);

    return NextResponse.json({
      success: true,
      guardias: result.rows
    });

  } catch (error) {
    console.error('❌ Error buscando guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 