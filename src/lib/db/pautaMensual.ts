import { query } from "@/lib/database";
import dayjs from "dayjs";

// Aplica un permiso (licencia, vacaciones, permiso) sobre la pauta del guardia
export async function aplicarPermisoEnPautaMensual({
  guardiaId,
  fechaInicio,
  fechaFin,
  tipoPermiso, // "licencia", "vacaciones", "permiso_con_goce", "permiso_sin_goce"
}: {
  guardiaId: string;
  fechaInicio: string;
  fechaFin: string;
  tipoPermiso: string;
}) {
  console.log(`🔧 Aplicando permiso ${tipoPermiso} para guardia ${guardiaId} desde ${fechaInicio} hasta ${fechaFin}`);

  try {
    // Actualizar la pauta mensual para marcar los días como permiso
    const result = await query(`
      UPDATE pautas_mensuales 
      SET tipo = $1, observacion = $2
      WHERE guardia_id = $3 
        AND dia >= $4 
        AND dia <= $5
    `, [tipoPermiso, `Permiso aplicado: ${tipoPermiso}`, guardiaId, fechaInicio, fechaFin]);

    console.log(`✅ Permiso ${tipoPermiso} aplicado en ${result.rowCount} días de la pauta`);
    return { success: true, updatedRows: result.rowCount };
  } catch (error) {
    console.error(`❌ Error aplicando permiso ${tipoPermiso}:`, error);
    throw error;
  }
}

// Obtiene la pauta mensual de un guardia en un rango de fechas
export async function obtenerPautaMensualGuardia({
  guardiaId,
  fechaInicio,
  fechaFin,
}: {
  guardiaId: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  try {
    const result = await query(`
      SELECT 
        pm.id,
        pm.dia,
        pm.tipo,
        pm.observacion,
        pm.instalacion_id,
        pm.rol_servicio_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM pautas_mensuales pm
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON pm.rol_servicio_id = rs.id
      WHERE pm.guardia_id = $1 
        AND pm.dia >= $2 
        AND pm.dia <= $3
      ORDER BY pm.dia
    `, [guardiaId, fechaInicio, fechaFin]);

    return result.rows;
  } catch (error) {
    console.error("❌ Error obteniendo pauta mensual:", error);
    throw error;
  }
}

// Verifica si un guardia tiene turnos asignados en un rango de fechas
export async function verificarTurnosAsignados({
  guardiaId,
  fechaInicio,
  fechaFin,
}: {
  guardiaId: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  try {
    const result = await query(`
      SELECT COUNT(*) as total_turnos
      FROM pautas_mensuales
      WHERE guardia_id = $1 
        AND dia >= $2 
        AND dia <= $3
        AND tipo = 'turno'
    `, [guardiaId, fechaInicio, fechaFin]);

    return parseInt(result.rows[0].total_turnos);
  } catch (error) {
    console.error("❌ Error verificando turnos asignados:", error);
    throw error;
  }
} 