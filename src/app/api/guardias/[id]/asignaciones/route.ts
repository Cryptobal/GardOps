import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET: Obtener asignaciones de un guardia específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id, nombre, apellido_paterno, apellido_materno FROM guardias WHERE id = $1',
      [guardiaId]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Obtener asignación actual del guardia (desde PPCs activos)
    const asignacionActual = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.fecha_asignacion,
        ppc.estado as ppc_estado,
        ppc.motivo as ppc_motivo,
        ppc.observaciones,
        ppc.created_at,
        ppc.updated_at,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.direccion as instalacion_direccion,
        i.ciudad as instalacion_ciudad,
        i.comuna as instalacion_comuna,
        
        -- Datos del rol de servicio
        rs.id as rol_servicio_id,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        rs.dias_trabajo,
        rs.dias_descanso
        
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos rp ON ppc.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ppc.guardia_asignado_id = $1 AND ppc.estado = 'Asignado'
      ORDER BY ppc.fecha_asignacion DESC
    `, [guardiaId]);

    // Obtener historial completo de asignaciones
    const historialAsignaciones = await query(`
      SELECT 
        ag.id as asignacion_id,
        ag.fecha_inicio,
        ag.fecha_termino,
        ag.estado as estado_asignacion,
        ag.tipo_asignacion,
        ag.observaciones,
        ag.created_at,
        ag.updated_at,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.direccion as instalacion_direccion,
        i.ciudad as instalacion_ciudad,
        i.comuna as instalacion_comuna,
        
        -- Datos del rol de servicio
        rs.id as rol_servicio_id,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        rs.dias_trabajo,
        rs.dias_descanso
        
      FROM as_turnos_asignaciones ag
      INNER JOIN as_turnos_requisitos rp ON ag.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ag.guardia_id = $1
      ORDER BY ag.fecha_inicio DESC, ag.created_at DESC
    `, [guardiaId]);

    // Obtener estadísticas de asignaciones
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total_asignaciones,
        COUNT(CASE WHEN estado = 'Activa' AND fecha_termino IS NULL THEN 1 END) as asignaciones_activas,
        COUNT(CASE WHEN estado = 'Finalizada' THEN 1 END) as asignaciones_finalizadas,
        COUNT(CASE WHEN tipo_asignacion = 'PPC' THEN 1 END) as asignaciones_ppc,
        COUNT(CASE WHEN tipo_asignacion = 'Reasignación' THEN 1 END) as reasignaciones
      FROM as_turnos_asignaciones 
      WHERE guardia_id = $1
    `, [guardiaId]);

    // Combinar asignación actual con historial
    const todasLasAsignaciones = [
      ...asignacionActual.rows.map(row => ({ 
        ...row, 
        fuente: 'ppc_activo',
        es_actual: true,
        duracion_dias: row.fecha_asignacion ? 
          Math.ceil((new Date().getTime() - new Date(row.fecha_asignacion).getTime()) / (1000 * 60 * 60 * 24)) : 0
      })),
      ...historialAsignaciones.rows.map(row => ({ 
        ...row, 
        fuente: 'historial',
        es_actual: false,
        duracion_dias: row.fecha_inicio && row.fecha_termino ? 
          Math.ceil((new Date(row.fecha_termino).getTime() - new Date(row.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)) : 0
      }))
    ].sort((a, b) => {
      const fechaA = a.fecha_asignacion || a.fecha_inicio;
      const fechaB = b.fecha_asignacion || b.fecha_inicio;
      return new Date(fechaB).getTime() - new Date(fechaA).getTime();
    });

    return NextResponse.json({
      guardia: guardiaCheck.rows[0],
      asignacion_actual: asignacionActual.rows[0] || null,
      asignaciones: todasLasAsignaciones,
      estadisticas: estadisticas.rows[0],
      total: todasLasAsignaciones.length,
      ppc_activos: asignacionActual.rows.length,
      historial: historialAsignaciones.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo asignaciones del guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 