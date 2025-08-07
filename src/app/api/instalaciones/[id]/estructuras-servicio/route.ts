import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener todas las estructuras de servicio de una instalación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    
    const result = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre
      FROM sueldo_estructuras_servicio es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.instalacion_id = $1
        AND rs.estado = 'Activo'
      ORDER BY rs.nombre, es.nombre_bono
    `, [instalacionId]);
    
    // Extraer solo el array de rows
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error obteniendo estructuras de servicio:', error);
    return NextResponse.json(
      { error: 'Error al obtener estructuras de servicio' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva estructura de servicio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { rol_servicio_id, nombre_bono, monto, imponible } = body;
    
    // Validar datos requeridos
    if (!rol_servicio_id || !nombre_bono || monto === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar que no exista un bono con el mismo nombre para el mismo rol
    const existingResult = await query(`
      SELECT id FROM sueldo_estructuras_servicio
      WHERE instalacion_id = $1
        AND rol_servicio_id = $2
        AND nombre_bono = $3
    `, [instalacionId, rol_servicio_id, nombre_bono]);
    
    const existing = Array.isArray(existingResult) ? existingResult : (existingResult.rows || []);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un bono con ese nombre para este rol' },
        { status: 400 }
      );
    }
    
    // Crear nueva estructura
    const result = await query(`
      INSERT INTO sueldo_estructuras_servicio (
        instalacion_id,
        rol_servicio_id,
        nombre_bono,
        monto,
        imponible
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      RETURNING *
    `, [instalacionId, rol_servicio_id, nombre_bono, monto, imponible !== false]);
    
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error creando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al crear estructura de servicio' },
      { status: 500 }
    );
  }
}
