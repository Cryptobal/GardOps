import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Obtener asignación actual activa usando el nuevo modelo de puestos operativos
    const asignacionActual = await query(`
      SELECT 
        po.id,
        po.guardia_id,
        po.creado_en as fecha_inicio,
        'Activa' as estado,
        'PPC' as tipo_asignacion,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        po.nombre_puesto
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.guardia_id = $1 AND po.activo = true
      ORDER BY po.creado_en DESC
      LIMIT 1
    `, [guardiaId]);

    // Obtener historial de asignaciones (por ahora vacío ya que no tenemos historial en el nuevo modelo)
    const historial = await query(`
      SELECT 
        po.id,
        po.creado_en as fecha_inicio,
        NULL as fecha_termino,
        'Activa' as estado,
        'PPC' as tipo_asignacion,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.guardia_id = $1 AND po.activo = true
      ORDER BY po.creado_en DESC
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
          instalacion_id: item.instalacion_id,
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
          instalacion_id: item.instalacion_id,
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