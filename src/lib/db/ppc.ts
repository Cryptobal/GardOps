import { query } from "@/lib/database";
import dayjs from "dayjs";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Cuando se ingresa un finiquito, actualizar pauta y generar PPC
export async function procesarFiniquitoYGenerarPPC({
  guardiaId,
  fechaFiniquito,
}: {
  guardiaId: string;
  fechaFiniquito: string;
}) {
  logger.debug(`🔧 Procesando finiquito para guardia ${guardiaId} en fecha ${fechaFiniquito}`);

  const siguienteDia = dayjs(fechaFiniquito).add(1, "day").format("YYYY-MM-DD");

  try {
    // Obtener la pauta del guardia desde el día siguiente al finiquito
    const pauta = await query(`
      SELECT 
        pm.id,
        pm.dia,
        pm.instalacion_id,
        pm.rol_servicio_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM pautas_mensuales pm
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON pm.rol_servicio_id = rs.id
      WHERE pm.guardia_id = $1 
        AND pm.dia >= $2
        AND pm.tipo = 'turno'
      ORDER BY pm.dia
    `, [guardiaId, siguienteDia]);

    logger.debug(`📋 Encontrados ${pauta.rows.length} turnos para procesar después del finiquito`);

    let ppcsCreados = 0;

    for (const dia of pauta.rows) {
      // Eliminar pauta asignada
      await query(`
        DELETE FROM pautas_mensuales 
        WHERE id = $1
      `, [dia.id]);

      // Buscar puestos operativos disponibles para esta instalación y rol
      const puestosDisponibles = await query(`
        SELECT id, nombre_puesto
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1 
          AND rol_id = $2 
          AND guardia_id IS NULL
        LIMIT 1
      `, [dia.instalacion_id, dia.rol_servicio_id]);

      if (puestosDisponibles.rows.length > 0) {
        // Marcar el puesto como PPC pendiente
        await query(`
          UPDATE as_turnos_puestos_operativos
          SET es_ppc = true, guardia_id = NULL
          WHERE id = $1
        `, [puestosDisponibles.rows[0].id]);

        ppcsCreados++;
        logger.debug(`✅ PPC creado para ${dia.instalacion_nombre} - ${dia.rol_servicio_nombre} en ${dia.dia}`);
      } else {
        logger.debug(`⚠️ No se encontró puesto operativo disponible para ${dia.instalacion_nombre} - ${dia.rol_servicio_id}`);
      }
    }

    logger.debug(`✅ Finiquito procesado: ${pauta.rows.length} turnos eliminados, ${ppcsCreados} PPCs creados`);
    return { success: true, turnosEliminados: pauta.rows.length, ppcsCreados };
  } catch (error) {
    console.error("❌ Error procesando finiquito:", error);
    throw error;
  }
}

// Obtener PPCs pendientes por instalación
export async function obtenerPPCsPendientes({
  instalacionId,
  fechaDesde,
  fechaHasta,
}: {
  instalacionId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  try {
    let whereConditions = ["po.es_ppc = true AND po.guardia_id IS NULL"];
    let params: any[] = [];
    let paramIndex = 1;

    if (instalacionId) {
      whereConditions.push(`po.instalacion_id = $${paramIndex}`);
      params.push(instalacionId);
      paramIndex++;
    }

    if (fechaDesde) {
      whereConditions.push(`po.creado_en >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`po.creado_en <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const result = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.instalacion_id,
        po.rol_id,
        po.creado_en as fecha_deteccion,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      ${whereClause}
      ORDER BY po.creado_en DESC
    `, params);

    logger.debug(`✅ Obtenidos ${result.rows.length} PPCs pendientes`);
    return result.rows;
  } catch (error) {
    console.error("❌ Error obteniendo PPCs pendientes:", error);
    throw error;
  }
}

// Asignar guardia a un PPC
export async function asignarGuardiaAPPC({
  ppcId,
  guardiaId,
}: {
  ppcId: number;
  guardiaId: string;
}) {
  try {
    logger.debug(`🔧 Asignando guardia ${guardiaId} al PPC ${ppcId}`);

    // Verificar que el PPC existe y está disponible
    const ppc = await query(`
      SELECT id, instalacion_id, rol_id, nombre_puesto
      FROM as_turnos_puestos_operativos
      WHERE id = $1 AND es_ppc = true AND guardia_id IS NULL
    `, [ppcId]);

    if (ppc.rows.length === 0) {
      throw new Error(`PPC ${ppcId} no encontrado o ya no está disponible`);
    }

    // Asignar el guardia al puesto
    const result = await query(`
      UPDATE as_turnos_puestos_operativos
      SET guardia_id = $1, es_ppc = false
      WHERE id = $2
    `, [guardiaId, ppcId]);

    logger.debug(`✅ Guardia ${guardiaId} asignado al puesto ${ppc.rows[0].nombre_puesto}`);
    return { success: true, puesto: ppc.rows[0] };
  } catch (error) {
    console.error("❌ Error asignando guardia a PPC:", error);
    throw error;
  }
} 