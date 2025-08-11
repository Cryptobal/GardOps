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
    // Ejecutar la función de Neon
    let query: string;
    let params: any[];
    
    if (rol_id) {
      // Si tenemos rol_id, usar la función original
      query = `
        SELECT 
          id, 
          nombre, 
          apellido_paterno, 
          apellido_materno
        FROM as_turnos.fn_guardias_disponibles($1::date, $2::uuid, $3::uuid, $4::text)
      `;
      
      params = [
        fecha,
        instalacion_id,
        rol_id,
        excluir_guardia_id || null
      ];
    } else {
      // Si no tenemos rol_id, buscar guardias disponibles sin filtro de rol usando consulta directa
      query = `
        SELECT 
          g.id, 
          g.nombre, 
          g.apellido_paterno, 
          g.apellido_materno
        FROM guardias g
        WHERE g.activo = true
          AND g.id NOT IN (
            SELECT DISTINCT po.guardia_id 
            FROM as_turnos_puestos_operativos po
            INNER JOIN as_turnos_pauta_mensual pm ON po.id = pm.puesto_id
            WHERE pm.anio = EXTRACT(YEAR FROM $1::date)
              AND pm.mes = EXTRACT(MONTH FROM $1::date)
              AND pm.dia = EXTRACT(DAY FROM $1::date)
              AND po.guardia_id IS NOT NULL
          )
          ${excluir_guardia_id ? 'AND g.id != $3::uuid' : ''}
        ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
        LIMIT 50
      `;
      
      params = excluir_guardia_id 
        ? [fecha, instalacion_id, excluir_guardia_id]
        : [fecha, instalacion_id];
    }
    
      console.log('Llamando función de guardias disponibles con params:', {
        fecha,
        instalacion_id,
        rol_id: rol_id || 'sin filtro',
        excluir_guardia_id: excluir_guardia_id || null,
        query: rol_id ? 'fn_guardias_disponibles' : 'consulta_directa'
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