import { query } from "@/lib/database";
import dayjs from "dayjs";

// Cuando se ingresa un finiquito, actualizar pauta y generar PPC
export async function procesarFiniquitoYGenerarPPC({
  guardiaId,
  fechaFiniquito,
}: {
  guardiaId: string;
  fechaFiniquito: string;
}) {
  console.log(`🔧 Procesando finiquito para guardia ${guardiaId} en fecha ${fechaFiniquito}`);

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

    console.log(`📋 Encontrados ${pauta.rows.length} turnos para procesar después del finiquito`);

    let ppcsCreados = 0;

    for (const dia of pauta.rows) {
      // Eliminar pauta asignada
      await query(`
        DELETE FROM pautas_mensuales 
        WHERE id = $1
      `, [dia.id]);

      // Obtener el requisito de puesto correspondiente
      const requisito = await query(`
        SELECT tr.id as requisito_puesto_id
        FROM as_turnos_requisitos tr
        WHERE tr.instalacion_id = $1 
          AND tr.rol_servicio_id = $2
          AND tr.estado = 'Activo'
        LIMIT 1
      `, [dia.instalacion_id, dia.rol_servicio_id]);

      if (requisito.rows.length > 0) {
        // Crear nuevo PPC en esa fecha
        await query(`
          INSERT INTO as_turnos_ppc (
            requisito_puesto_id,
            motivo,
            observaciones,
            cantidad_faltante,
            prioridad,
            fecha_deteccion,
            estado,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
          )
        `, [
          requisito.rows[0].requisito_puesto_id,
          'renuncia', // motivo del finiquito
          `PPC generado por finiquito del guardia ${guardiaId} en ${fechaFiniquito}`,
          1, // cantidad_faltante
          'Alta', // prioridad alta por finiquito
          dia.dia, // fecha_deteccion
          'Pendiente' // estado
        ]);

        ppcsCreados++;
        console.log(`✅ PPC creado para ${dia.instalacion_nombre} - ${dia.rol_servicio_nombre} en ${dia.dia}`);
      } else {
        console.log(`⚠️ No se encontró requisito de puesto para ${dia.instalacion_nombre} - ${dia.rol_servicio_id}`);
      }
    }

    console.log(`✅ Finiquito procesado: ${pauta.rows.length} turnos eliminados, ${ppcsCreados} PPCs creados`);
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
    let whereConditions = ["ppc.estado = 'Pendiente'"];
    let params: any[] = [];
    let paramIndex = 1;

    if (instalacionId) {
      whereConditions.push(`tr.instalacion_id = $${paramIndex}`);
      params.push(instalacionId);
      paramIndex++;
    }

    if (fechaDesde) {
      whereConditions.push(`ppc.fecha_deteccion >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`ppc.fecha_deteccion <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const result = await query(`
      SELECT 
        ppc.id,
        ppc.motivo,
        ppc.observaciones,
        ppc.cantidad_faltante,
        ppc.prioridad,
        ppc.fecha_deteccion,
        ppc.estado,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      ${whereClause}
      ORDER BY ppc.prioridad DESC, ppc.fecha_deteccion ASC
    `, params);

    return result.rows;
  } catch (error) {
    console.error("❌ Error obteniendo PPCs pendientes:", error);
    throw error;
  }
}

// Asignar un guardia a un PPC
export async function asignarGuardiaAPPC({
  ppcId,
  guardiaId,
}: {
  ppcId: number;
  guardiaId: string;
}) {
  try {
    const result = await query(`
      UPDATE as_turnos_ppc 
      SET 
        guardia_asignado_id = $1,
        estado = 'Asignado',
        fecha_asignacion = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [guardiaId, ppcId]);

    if (result.rowCount > 0) {
      console.log(`✅ Guardia ${guardiaId} asignado al PPC ${ppcId}`);
      return { success: true };
    } else {
      throw new Error(`PPC ${ppcId} no encontrado`);
    }
  } catch (error) {
    console.error("❌ Error asignando guardia a PPC:", error);
    throw error;
  }
} 