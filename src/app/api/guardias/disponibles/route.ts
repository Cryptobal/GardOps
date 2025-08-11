import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  const client = await getClient();
  const searchParams = request.nextUrl.searchParams;
  
  // Obtener parámetros de query
  const fecha = searchParams.get('fecha');
  const instalacion_id = searchParams.get('instalacion_id');
  const rol_id = searchParams.get('rol_id');
  const excluir_guardia_id = searchParams.get('excluir_guardia_id');
  
  // Validar parámetros obligatorios
  if (!fecha) {
    return NextResponse.json(
      { error: 'El parámetro "fecha" es obligatorio (formato YYYY-MM-DD)' },
      { status: 400 }
    );
  }
  
  if (!instalacion_id) {
    return NextResponse.json(
      { error: 'El parámetro "instalacion_id" es obligatorio' },
      { status: 400 }
    );
  }
  
  // rol_id es opcional, si no está presente se buscarán guardias sin filtro de rol
  
  // Validar formato de fecha
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return NextResponse.json(
      { error: 'El formato de fecha debe ser YYYY-MM-DD' },
      { status: 400 }
    );
  }
  
  try {
    // Ejecutar consulta directa simplificada
    let query: string;
    let params: any[];
    
    // Consulta simplificada para buscar guardias disponibles
    // Por ahora, simplemente buscar guardias activos que no estén asignados ese día
    let baseQuery = `
      SELECT DISTINCT
        g.id, 
        g.nombre, 
        g.apellido_paterno, 
        g.apellido_materno
      FROM guardias g
      WHERE g.activo = true
    `;

    // Agregar condición para excluir guardias ya asignados ese día
    baseQuery += `
        AND g.id NOT IN (
          SELECT DISTINCT guardia_id 
          FROM as_turnos_pauta_mensual
          WHERE anio = EXTRACT(YEAR FROM $1::date)
            AND mes = EXTRACT(MONTH FROM $1::date)
            AND dia = EXTRACT(DAY FROM $1::date)
            AND guardia_id IS NOT NULL
        )
    `;

    // Si hay un guardia a excluir, agregarlo
    if (excluir_guardia_id) {
      baseQuery += ` AND g.id != $2::uuid `;
    }

    // Ordenar y limitar resultados
    baseQuery += `
      ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
      LIMIT 100
    `;

    query = baseQuery;
    
    // Construir parámetros basados en lo que está presente
    params = [fecha];
    if (excluir_guardia_id) {
      params.push(excluir_guardia_id);
    }
    
    console.log('Ejecutando consulta de guardias disponibles con params:', {
      fecha,
      instalacion_id,
      rol_id: rol_id || 'sin filtro',
      excluir_guardia_id: excluir_guardia_id || null
    });
    
    const result = await client.query(query, params);
    
    // Formatear respuesta con nombre_completo (formato: Apellido Paterno Apellido Materno, Nombre)
    const items = result.rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      apellido_paterno: row.apellido_paterno,
      apellido_materno: row.apellido_materno,
      nombre_completo: `${row.apellido_paterno || ''} ${row.apellido_materno || ''}, ${row.nombre || ''}`.trim()
    }));
    
    console.log(`Guardias disponibles encontrados: ${items.length}`);
    
    return NextResponse.json({ items });
    
  } catch (error) {
    console.error('Error al obtener guardias disponibles:', error);
    return NextResponse.json(
      { error: 'Error al obtener guardias disponibles' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}