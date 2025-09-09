import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const instalacion = searchParams.get('instalacion');
    const rol = searchParams.get('rol');
    const prioridad = searchParams.get('prioridad');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let whereConditions = ['pd.es_ppc = true']; // Siempre filtrar por PPC
    let params: any[] = [];
    let paramIndex = 1;

    // Filtrar por estado usando la lógica de la pauta diaria
    if (estado && estado !== 'all') {
      if (estado === 'Pendiente') {
        // En la vista de pauta diaria, los PPCs pendientes tienen estado 'plan'
        whereConditions.push(`pd.estado_ui = 'plan'`);
      } else if (estado === 'Cubierto') {
        // PPCs cubiertos tienen guardia asignado
        whereConditions.push(`pd.guardia_trabajo_id IS NOT NULL`);
      }
    }

    if (instalacion && instalacion !== 'all') {
      whereConditions.push(`pd.instalacion_nombre = $${paramIndex}`);
      params.push(instalacion);
      paramIndex++;
    }

    if (rol && rol !== 'all') {
      whereConditions.push(`pd.rol_nombre = $${paramIndex}`);
      params.push(rol);
      paramIndex++;
    }

    // Filtrar por fecha usando la fecha de la pauta
    if (fechaDesde) {
      whereConditions.push(`pd.fecha >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`pd.fecha <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Migrado al nuevo modelo as_turnos_puestos_operativos
    // Consulta de prueba para debug
    devLogger.search(' Consulta SQL:', `
      SELECT 
        po.id,
        po.creado_en as created_at,
        po.guardia_id as guardia_asignado_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        g.rut as guardia_rut
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      ${whereClause}
      ORDER BY i.nombre, rs.nombre, po.creado_en DESC
    `);
    devLogger.search(' Parámetros:', params);
    
    // SOLUCIÓN DIRECTA: Usar tabla as_turnos_puestos_operativos en lugar de vista
    // La vista no está sincronizada correctamente con los cambios de asignación/desasignación
    
    let query_sql = `
      SELECT 
        po.id as puesto_id,
        po.instalacion_id,
        po.rol_id,
        po.es_ppc,
        po.guardia_id,
        po.creado_en,
        po.actualizado_en,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino as hora_fin,
        g.id as guardia_trabajo_id,
        CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_trabajo_nombre,
        g.telefono as guardia_trabajo_telefono,
        CURRENT_DATE as fecha,
        CASE 
          WHEN po.guardia_id IS NULL THEN 'plan'
          ELSE 'cubierto'
        END as estado_ui
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.activo = true AND po.es_ppc = true
    `;

    // Agregar filtros específicos de PPCs
    if (estado && estado !== 'all') {
      if (estado === 'Pendiente') {
        query_sql += ` AND po.guardia_id IS NULL`;
      } else if (estado === 'Cubierto') {
        query_sql += ` AND po.guardia_id IS NOT NULL`;
      }
    }

    if (instalacion && instalacion !== 'all') {
      query_sql += ` AND i.nombre = '${instalacion}'`;
    }

    if (rol && rol !== 'all') {
      query_sql += ` AND rs.nombre = '${rol}'`;
    }

    if (fechaDesde) {
      query_sql += ` AND po.creado_en >= '${fechaDesde}'`;
    }

    if (fechaHasta) {
      query_sql += ` AND po.creado_en <= '${fechaHasta}'`;
    }

    query_sql += ` ORDER BY po.es_ppc DESC, i.nombre, rs.nombre, po.creado_en DESC`;

    logger.debug('🔍 SOLUCIÓN DIRECTA: Usando tabla as_turnos_puestos_operativos');
    devLogger.search(' Consulta SQL final:', query_sql);

    const ppcs = await query(query_sql);
    
    devLogger.search(' Resultado de la consulta:', ppcs.rows.length, 'filas');
    console.log('🔍 Primeras 3 filas:', ppcs.rows.slice(0, 3));

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.puesto_id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.rol_nombre?.includes('Noche') || ppc.rol_nombre?.includes('N ') ? 'N' : 'D',
        rol_tipo: ppc.rol_nombre || '4x4',
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_fin || '20:00'}`,
        estado: ppc.estado_ui === 'plan' ? 'Pendiente' : (ppc.guardia_trabajo_id ? 'Cubierto' : 'Pendiente'),
        creado: ppc.fecha,
        guardia_asignado: ppc.guardia_trabajo_id ? {
          id: ppc.guardia_trabajo_id,
          nombre: ppc.guardia_trabajo_nombre,
          rut: ppc.guardia_trabajo_telefono || ''
        } : null
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error obteniendo PPCs::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 