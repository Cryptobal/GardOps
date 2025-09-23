import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.debug("🔁 Endpoint activo: /api/instalaciones/[id]/ppc-activos");
  
  try {
    const instalacionId = params.id;

    // Obtener PPC pendientes de la instalación (solo puestos activos)
    const ppcs = await query(`
      SELECT 
        po.id,
        po.rol_id,
        po.nombre_puesto,
        po.creado_en as created_at,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE i.id = $1 AND po.es_ppc = true AND po.activo = true AND po.guardia_id IS NULL
      ORDER BY rs.nombre, po.creado_en DESC
    `, [instalacionId]);

    logger.debug(`🔍 PPCs encontrados para instalación ${instalacionId}:`, {
      total: ppcs.rows.length,
      ppcs: ppcs.rows.map(p => ({
        id: p.id,
        nombre: p.nombre_puesto,
        activo: p.activo,
        es_ppc: p.es_ppc,
        guardia_id: p.guardia_id,
        rol: p.rol_nombre
      }))
    });

    // Debug adicional: verificar si hay puestos operativos en general
    const debugQuery = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.activo,
        po.es_ppc,
        po.guardia_id,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.instalacion_id = $1
      ORDER BY po.creado_en DESC
      LIMIT 10
    `, [instalacionId]);

    logger.debug(`🔍 Debug - Todos los puestos operativos para instalación ${instalacionId}:`, {
      total: debugQuery.rows.length,
      puestos: debugQuery.rows.map(p => ({
        id: p.id,
        nombre: p.nombre_puesto,
        activo: p.activo,
        es_ppc: p.es_ppc,
        guardia_id: p.guardia_id,
        rol: p.rol_nombre,
        instalacion: p.instalacion_nombre
      }))
    });

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion_id: ppc.instalacion_id,
        instalacion_nombre: ppc.instalacion_nombre,
        rol_servicio_id: ppc.rol_id,
        rol_servicio_nombre: ppc.rol_nombre,
        rol_nombre: ppc.rol_nombre, // Alias para compatibilidad
        nombre_puesto: ppc.nombre_puesto,
        hora_inicio: ppc.hora_inicio,
        hora_termino: ppc.hora_termino,
        motivo: ppc.guardia_id ? 'Puesto operativo asignado' : 'Puesto operativo sin asignación',
        observacion: `PPC para puesto: ${ppc.nombre_puesto}`,
        creado_en: ppc.created_at,
        cantidad_faltante: 1,
        estado: ppc.guardia_id ? 'Asignado' : 'Pendiente',
        guardia_asignado_id: ppc.guardia_id,
        guardia_nombre: ppc.guardia_nombre,
        tipo_puesto_id: ppc.tipo_puesto_id,
        tipo_nombre: ppc.tipo_nombre,
        tipo_emoji: ppc.tipo_emoji,
        tipo_color: ppc.tipo_color
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error obteniendo PPC pendientes de la instalación::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 