import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { sql } from '@/lib/db';
import { isNewTurnosApiEnabledServer } from '@/lib/feature';

export async function GET(request: NextRequest) {
const deny = await requireAuthz(request, { resource: 'guardias', action: 'read:list' });
if (deny) return deny;

  const searchParams = request.nextUrl.searchParams;
  
  // Obtener parámetros de query
  const fecha = searchParams.get('fecha');
  const instalacion_id = searchParams.get('instalacion_id') || searchParams.get('instalacionId');
  const rol_id = searchParams.get('rol_id');
  const excluir_guardia_id = searchParams.get('excluir_guardia_id');
  const search = searchParams.get('search') || '';
  
  // Validar parámetros obligatorios
  if (!instalacion_id) {
    return NextResponse.json(
      { error: 'El parámetro "instalacion_id" es obligatorio' },
      { status: 400 }
    );
  }
  
  // Si no hay fecha, usar la fecha actual para compatibilidad
  const fechaActual = fecha || new Date().toISOString().split('T')[0];
  
  // rol_id es opcional, si no está presente se buscarán guardias sin filtro de rol
  
  // Validar formato de fecha solo si se proporciona
  if (fecha) {
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
      return NextResponse.json(
        { error: 'El formato de fecha debe ser YYYY-MM-DD' },
        { status: 400 }
      );
    }
  }
  
  try {
    // Verificar si usamos la nueva API con funciones de Neon (server-safe)
    // TEMPORALMENTE DESHABILITADO - usar siempre consulta directa para obtener RUTs correctos
    if (false && isNewTurnosApiEnabledServer()) {
      console.info('[guardias/disponibles] Usando función de Neon fn_guardias_disponibles');
      
      // Usar función de Neon para obtener guardias disponibles
      const { rows } = await sql`
        SELECT * FROM as_turnos.fn_guardias_disponibles(
          ${fechaActual}::date,
          ${instalacion_id}::uuid,
          ${rol_id || null}::uuid,
          ${excluir_guardia_id || null}::uuid
        );
      `;
      
      // La función retorna guardia_id y nombre
      const items = rows.map(row => {
        // Debug: ver qué datos retorna la función de Neon
        console.log('🔍 Datos de Neon:', row);
        
        const nombreCompleto = row.nombre || 'Sin nombre';
        const rut = row.rut || 'Sin RUT';
        
        return {
          id: row.guardia_id,
          nombre_completo: nombreCompleto,
          // Para compatibilidad con el frontend
          nombre: nombreCompleto?.split(',')[1]?.trim() || nombreCompleto,
          apellido_paterno: nombreCompleto?.split(',')[0]?.split(' ')[0] || '',
          apellido_materno: nombreCompleto?.split(',')[0]?.split(' ')[1] || '',
          rut: rut,
          tiene_asignacion_activa: false // Los guardias de la función ya están filtrados
        };
      });
      
      console.log(`[Neon] Guardias disponibles encontrados: ${items.length}`);
      return NextResponse.json({ items });
    }
    
    // Flujo legacy con query directa
    console.info('[guardias/disponibles] Usando query directa para obtener RUTs correctos');
    const client = await getClient();
    
    try {
    // Ejecutar consulta directa simplificada
    let query: string;
    let params: any[];
    
    // Consulta simple que funciona
    let baseQuery = `
      SELECT 
        g.id, 
        g.nombre, 
        g.apellido_paterno, 
        g.apellido_materno,
        g.rut,
        false as tiene_asignacion_activa
      FROM guardias g
      WHERE g.activo = true
    `;

    // Agregar filtro de búsqueda si se proporciona
    if (search.trim()) {
      baseQuery += `
        AND (
          LOWER(g.nombre) LIKE LOWER($1) OR 
          LOWER(g.apellido_paterno) LIKE LOWER($1) OR 
          LOWER(g.apellido_materno) LIKE LOWER($1) OR
          LOWER(g.rut) LIKE LOWER($1)
        )
      `;
    }

    // Ordenar por apellido paterno, apellido materno, nombre
    baseQuery += `
      ORDER BY g.apellido_paterno ASC, g.apellido_materno ASC, g.nombre ASC
      LIMIT 100
    `;

    query = baseQuery;
    
    // Construir parámetros basados en lo que está presente
    params = [];
    
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
    }
    
    console.log('Ejecutando consulta de guardias disponibles con params:', {
      search: search || null,
      params
    });
    
    const result = await client.query(query, params);
    
    // Debug: ver qué datos llegan de la base de datos
    console.log('🔍 Datos de guardias desde BD:', result.rows.slice(0, 3));
    
    // Formatear respuesta con nombre_completo (formato: Apellido Paterno Apellido Materno, Nombre)
    const items = result.rows.map(row => {
      const rut: string | null = row.rut ? String(row.rut) : null;
      const nombreCompleto = `${(row.apellido_paterno || '').toUpperCase()} ${(row.apellido_materno || '').toUpperCase()}, ${row.nombre || ''}`.trim();
      
      return {
        id: row.id,
        nombre: row.nombre,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        rut,
        nombre_completo: nombreCompleto,
        tiene_asignacion_activa: row.tiene_asignacion_activa
      };
    });
    
    console.log(`[Legacy] Guardias disponibles encontrados: ${items.length}`);
    
    return NextResponse.json({ items });
    
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error al obtener guardias disponibles:', error);
    
    // Si el error es específico, proporcionar más detalles
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Función fn_guardias_disponibles no encontrada. Asegúrese de ejecutar las migraciones.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al obtener guardias disponibles' },
      { status: 500 }
    );
  }
}