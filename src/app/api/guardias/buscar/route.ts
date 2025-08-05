import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const instalacionId = searchParams.get('instalacion_id');
    const fecha = searchParams.get('fecha');

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
    let fechaCondition = '';
    if (fecha) {
      const fechaObj = new Date(fecha + 'T00:00:00.000Z');
      const anio = fechaObj.getUTCFullYear();
      const mes = fechaObj.getUTCMonth() + 1;
      const dia = fechaObj.getUTCDate();

      // En la pauta diaria, permitimos asignar guardias incluso si ya tienen turno
      // porque pueden hacer turnos extras. Solo marcamos para información.
      
      // Condición para verificar si el guardia ya tiene turno asignado en esa fecha
      fechaCondition = `
        LEFT JOIN (
          SELECT 
            pm.guardia_id,
            true as tiene_turno_asignado
          FROM as_turnos_pauta_mensual pm
          WHERE pm.anio = $${paramIndex} AND pm.mes = $${paramIndex + 1} AND pm.dia = $${paramIndex + 2}
        ) turno_asignado ON g.id = turno_asignado.guardia_id
      `;
      
      // Agregar los parámetros de fecha después de construir la condición
      params.push(anio, mes, dia);
      paramIndex += 3;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta corregida con verificación de turno asignado
    let sqlQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.activo,
        po.instalacion_id as instalacion_actual_id,
        i.nombre as instalacion_actual_nombre,
        COALESCE(turno_asignado.tiene_turno_asignado, false) as tiene_turno_asignado
      FROM guardias g
      LEFT JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id AND po.es_ppc = false
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      ${fechaCondition}
    `;

    sqlQuery += `
      WHERE ${whereClause}
      ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
      LIMIT 20
    `;

    console.log('🔍 Buscando guardias con parámetros:', { search, instalacionId, fecha, params });
    const result = await query(sqlQuery, params);
    console.log('✅ Guardias encontrados:', result.rows.length);

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