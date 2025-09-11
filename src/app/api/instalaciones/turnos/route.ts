import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Obtener turnos de múltiples instalaciones
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instalacionIds = searchParams.get('instalacion_ids');
    
    if (!instalacionIds) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere el parámetro instalacion_ids' 
      }, { status: 400 });
    }

    const ids = instalacionIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // Construir la consulta para múltiples instalaciones
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    
    const query = `
      SELECT 
        ti.id,
        ti.instalacion_id,
        ti.nombre,
        ti.hora_inicio,
        ti.hora_fin,
        ti.estado,
        ti.guardias_requeridos,
        ti.guardias_asignados,
        ti.ppc_pendientes,
        ti.created_at,
        ti.updated_at,
        rs.nombre as rol_nombre,
        rs.descripcion as rol_descripcion
      FROM turnos_instalacion ti
      LEFT JOIN roles_servicio rs ON ti.rol_servicio_id = rs.id
      WHERE ti.instalacion_id IN (${placeholders})
      AND ti.estado = 'Activo'
      ORDER BY ti.instalacion_id, ti.hora_inicio
    `;

    const result = await sql.query(query, ids);

    // Agrupar turnos por instalación
    const turnosPorInstalacion: Record<string, any[]> = {};
    
    result.rows.forEach((row: any) => {
      const instalacionId = row.instalacion_id;
      if (!turnosPorInstalacion[instalacionId]) {
        turnosPorInstalacion[instalacionId] = [];
      }
      
      turnosPorInstalacion[instalacionId].push({
        id: row.id,
        instalacion_id: row.instalacion_id,
        nombre: row.nombre,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
        estado: row.estado,
        guardias_requeridos: row.guardias_requeridos,
        guardias_asignados: row.guardias_asignados,
        ppc_pendientes: row.ppc_pendientes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        rol_nombre: row.rol_nombre,
        rol_descripcion: row.rol_descripcion
      });
    });

    return NextResponse.json({
      success: true,
      data: turnosPorInstalacion
    });

  } catch (error) {
    logger.error('Error obteniendo turnos de instalaciones::', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 