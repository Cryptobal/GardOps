import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { sql } from '@/lib/db';
import { isNewTurnosApiEnabledServer } from '@/lib/feature';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
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
    // Verificar si usamos la nueva API con funciones de Neon (server-safe)
    if (isNewTurnosApiEnabledServer()) {
      console.info('[guardias/disponibles] Usando función de Neon fn_guardias_disponibles_con_asignacion');
      
      // Usar función de Neon mejorada para obtener guardias disponibles con información de asignación
      const { rows } = await sql`
        SELECT * FROM as_turnos.fn_guardias_disponibles_con_asignacion(
          ${fecha}::date,
          ${instalacion_id}::uuid,
          ${rol_id || null}::uuid,
          ${excluir_guardia_id || null}::uuid
        );
      `;
      
      // La función retorna guardia_id, nombre, rut, instalacion_actual_id, instalacion_actual_nombre, puesto_actual_nombre
      const items = rows.map(row => ({
        id: row.guardia_id,
        nombre_completo: row.nombre,
        rut: row.rut || '',
        // Para compatibilidad con el frontend
        nombre: row.nombre?.split(',')[1]?.trim() || row.nombre,
        apellido_paterno: row.nombre?.split(',')[0]?.split(' ')[0] || '',
        apellido_materno: row.nombre?.split(',')[0]?.split(' ')[1] || '',
        // Información de asignación actual
        instalacion_actual_id: row.instalacion_actual_id,
        instalacion_actual_nombre: row.instalacion_actual_nombre,
        puesto_actual_nombre: row.puesto_actual_nombre
      }));
      
      logger.debug(`[Neon] Guardias disponibles encontrados: ${items.length}`);
      console.log(`[Neon] Guardias con asignación actual: ${items.filter(g => g.instalacion_actual_id).length}`);
      
      return NextResponse.json({ items });
    }
    
    // Flujo legacy con query directa
    console.info('[guardias/disponibles] Usando query legacy');
    const client = await getClient();
    
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
        g.apellido_materno,
        g.rut
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
    
    logger.debug('Ejecutando consulta de guardias disponibles con params:', {
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
      rut: row.rut || '', // Agregar campo rut
      nombre_completo: `${row.apellido_paterno || ''} ${row.apellido_materno || ''}, ${row.nombre || ''}`.trim()
    }));
    
    logger.debug(`[Legacy] Guardias disponibles encontrados: ${items.length}`);
    
    return NextResponse.json({ items });
    
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error al obtener guardias disponibles::', error);
    
    // Si el error es específico, proporcionar más detalles
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Función fn_guardias_disponibles_con_asignacion no encontrada. Asegúrese de ejecutar las migraciones.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al obtener guardias disponibles' },
      { status: 500 }
    );
  }
}