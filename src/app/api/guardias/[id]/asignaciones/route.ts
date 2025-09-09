import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    if (!guardiaId) {
      return NextResponse.json(
        { error: 'ID de guardia es requerido' },
        { status: 400 }
      );
    }

    // Obtener asignación actual (directa en puestos operativos)
    const { rows: asignacionActualRows } = await sql`
      SELECT 
        po.id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        po.actualizado_en as fecha_inicio,
        'activa' as estado,
        'directa' as tipo_asignacion
      FROM public.as_turnos_puestos_operativos po
      JOIN public.instalaciones i ON i.id = po.instalacion_id
      WHERE po.guardia_id = ${guardiaId}::uuid
        AND po.activo = true
      ORDER BY po.actualizado_en DESC
      LIMIT 1;
    `;

    // Obtener historial de asignaciones en pauta mensual
    const { rows: historialRows } = await sql`
      SELECT 
        pm.id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        pm.created_at as fecha_inicio,
        CASE 
          WHEN pm.estado = 'Asignado' THEN 'activa'
          ELSE 'finalizada'
        END as estado,
        'pauta_mensual' as tipo_asignacion
      FROM public.as_turnos_pauta_mensual pm
      JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      JOIN public.instalaciones i ON i.id = po.instalacion_id
      WHERE pm.guardia_id = ${guardiaId}::uuid
        AND pm.estado = 'Asignado'
      ORDER BY pm.created_at DESC
      LIMIT 20;
    `;

    // Combinar y formatear resultados
    const asignacionActual = asignacionActualRows.length > 0 ? {
      id: asignacionActualRows[0].id,
      instalacion_id: asignacionActualRows[0].instalacion_id,
      instalacion_nombre: asignacionActualRows[0].instalacion_nombre,
      puesto_nombre: asignacionActualRows[0].nombre_puesto,
      fecha_inicio: asignacionActualRows[0].fecha_inicio,
      estado: asignacionActualRows[0].estado,
      tipo_asignacion: asignacionActualRows[0].tipo_asignacion
    } : null;

    const historial = historialRows.map(row => ({
      id: row.id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      puesto_nombre: row.nombre_puesto,
      fecha_inicio: row.fecha_inicio,
      estado: row.estado,
      tipo_asignacion: row.tipo_asignacion
    }));

    // Combinar historial con asignación actual (evitando duplicados)
    const todasLasAsignaciones = [...historial];
    
    // Solo agregar asignación actual si no está en el historial
    if (asignacionActual && !historial.some(h => 
      h.instalacion_id === asignacionActual.instalacion_id && 
      h.puesto_nombre === asignacionActual.puesto_nombre
    )) {
      todasLasAsignaciones.unshift(asignacionActual);
    }

    return NextResponse.json({
      asignacionActual,
      asignaciones: todasLasAsignaciones
    });

  } catch (error) {
    logger.error('Error al obtener asignaciones del guardia::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 