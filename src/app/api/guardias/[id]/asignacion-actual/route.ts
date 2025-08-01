import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Obtener asignación actual activa
    const asignacionActual = await query(`
      SELECT 
        ta.id,
        ta.guardia_id,
        ta.fecha_inicio,
        ta.estado,
        ta.tipo_asignacion,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ta.guardia_id = $1 AND ta.estado = 'Activa'
      ORDER BY ta.fecha_inicio DESC
      LIMIT 1
    `, [guardiaId]);

    // Obtener historial de asignaciones
    const historial = await query(`
      SELECT 
        ta.id,
        ta.fecha_inicio,
        ta.fecha_termino,
        ta.estado,
        ta.tipo_asignacion,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ta.guardia_id = $1
      ORDER BY ta.fecha_inicio DESC
    `, [guardiaId]);

    const asignacion = asignacionActual.rows[0];
    
    if (asignacion) {
      return NextResponse.json({
        tieneAsignacion: true,
        asignacionActual: {
          id: asignacion.id,
          instalacion: asignacion.instalacion_nombre,
          instalacion_id: asignacion.instalacion_id,
          rol: asignacion.rol_nombre,
          jornada: asignacion.rol_nombre,
          ppc_id: null,
          fecha_asignacion: asignacion.fecha_inicio
        },
        historial: historial.rows.map((item: any) => ({
          id: item.id,
          instalacion: item.instalacion_nombre,
          rol: item.rol_nombre,
          fecha_asignacion: item.fecha_inicio,
          fecha_termino: item.fecha_termino,
          estado: item.estado,
          tipo: item.tipo_asignacion,
          ppc_id: null
        }))
      });
    } else {
      return NextResponse.json({
        tieneAsignacion: false,
        asignacionActual: null,
        historial: historial.rows.map((item: any) => ({
          id: item.id,
          instalacion: item.instalacion_nombre,
          rol: item.rol_nombre,
          fecha_asignacion: item.fecha_inicio,
          fecha_termino: item.fecha_termino,
          estado: item.estado,
          tipo: item.tipo_asignacion,
          ppc_id: null
        }))
      });
    }

  } catch (error) {
    console.error('Error obteniendo asignación del guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 