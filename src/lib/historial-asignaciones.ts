/**
 * Utilidades para manejar historial de asignaciones de guardias
 * CONSERVADOR - Mantiene compatibilidad con lógica existente
 */

import { query } from '@/lib/database';

export interface AsignacionHistorial {
  id: number;
  guardia_id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  fecha_inicio: string;
  fecha_termino: string | null;
  tipo_asignacion: 'fija' | 'temporal' | 'reemplazo';
  motivo_inicio: string;
  motivo_termino: string | null;
  estado: 'activa' | 'finalizada' | 'cancelada';
  duracion_dias: number;
}

export interface AsignacionActual {
  id: number;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  fecha_inicio: string;
  tipo_asignacion: string;
}

/**
 * Obtener asignación actual de un guardia
 * SEGURO - No afecta lógica existente
 */
export async function obtenerAsignacionActual(guardia_id: string): Promise<AsignacionActual | null> {
  try {
    const result = await query(`
      SELECT * FROM obtener_asignacion_actual_guardia($1)
    `, [guardia_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.asignacion_id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      puesto_id: row.puesto_id,
      puesto_nombre: row.puesto_nombre,
      fecha_inicio: row.fecha_inicio,
      tipo_asignacion: row.tipo_asignacion
    };
  } catch (error) {
    console.error('Error obteniendo asignación actual:', error);
    return null;
  }
}

/**
 * Obtener historial completo de asignaciones de un guardia
 * SEGURO - No afecta lógica existente
 */
export async function obtenerHistorialAsignaciones(guardia_id: string): Promise<AsignacionHistorial[]> {
  try {
    const result = await query(`
      SELECT * FROM obtener_historial_asignaciones_guardia($1)
    `, [guardia_id]);
    
    return result.rows.map(row => ({
      id: row.asignacion_id,
      guardia_id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      puesto_id: row.puesto_id,
      puesto_nombre: row.puesto_nombre,
      fecha_inicio: row.fecha_inicio,
      fecha_termino: row.fecha_termino,
      tipo_asignacion: row.tipo_asignacion,
      motivo_inicio: row.motivo_inicio,
      motivo_termino: row.motivo_termino,
      estado: row.estado,
      duracion_dias: row.duracion_dias
    }));
  } catch (error) {
    console.error('Error obteniendo historial de asignaciones:', error);
    return [];
  }
}

/**
 * Asignar guardia a puesto con fecha específica
 * SEGURO - Mantiene lógica existente como fallback
 */
export async function asignarGuardiaConFecha(
  guardia_id: string,
  puesto_id: string,
  instalacion_id: string,
  fecha_inicio: string,
  tipo_asignacion: 'fija' | 'temporal' | 'reemplazo' = 'fija',
  motivo_inicio: string = 'asignacion_manual',
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    // 1. Verificar que no hay asignación activa del guardia
    const asignacionActiva = await query(`
      SELECT id FROM historial_asignaciones_guardias 
      WHERE guardia_id = $1 AND estado = 'activa' AND fecha_termino IS NULL
    `, [guardia_id]);
    
    // 2. Si hay asignación activa, terminarla
    if (asignacionActiva.rows.length > 0) {
      // CORREGIDO: Parsear fecha en zona horaria local para evitar problemas de UTC
      const fechaTermino = new Date(fecha_inicio + 'T12:00:00');
      fechaTermino.setDate(fechaTermino.getDate() - 1); // Día anterior al inicio
      
      console.log('🔍 [HISTORIAL] Procesando fecha de término:', {
        fecha_inicio_recibida: fecha_inicio,
        fechaTerminoCalculada: fechaTermino.toISOString().split('T')[0],
        fechaActualUTC: new Date().toISOString(),
        fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
      });
      
      await query(`
        UPDATE historial_asignaciones_guardias 
        SET 
          fecha_termino = $1,
          estado = 'finalizada',
          motivo_termino = 'reasignacion',
          updated_at = NOW()
        WHERE guardia_id = $2 AND estado = 'activa' AND fecha_termino IS NULL
      `, [fechaTermino.toISOString().split('T')[0], guardia_id]);
    }
    
    // 3. Crear nueva asignación en historial (CON TENANT_ID)
    await query(`
      INSERT INTO historial_asignaciones_guardias (
        guardia_id, instalacion_id, puesto_id, fecha_inicio,
        tipo_asignacion, motivo_inicio, estado, observaciones, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'activa', $7, obtener_tenant_id_actual())
    `, [guardia_id, instalacion_id, puesto_id, fecha_inicio, tipo_asignacion, motivo_inicio, observaciones]);
    
    // 4. Actualizar puesto operativo (MANTENER LÓGICA EXISTENTE)
    await query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        guardia_id = $1,
        es_ppc = false,
        actualizado_en = NOW()
      WHERE id = $2
    `, [guardia_id, puesto_id]);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error en asignación con fecha:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Terminar asignación actual de un guardia
 * SEGURO - Para uso con finiquitos
 */
export async function terminarAsignacionActual(
  guardia_id: string,
  fecha_termino: string,
  motivo_termino: string = 'finiquito',
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    const result = await query(`
      UPDATE historial_asignaciones_guardias 
      SET 
        fecha_termino = $1,
        estado = 'finalizada',
        motivo_termino = $2,
        observaciones = COALESCE(observaciones, '') || ' - ' || COALESCE($3, ''),
        updated_at = NOW()
      WHERE guardia_id = $4 
        AND estado = 'activa' 
        AND fecha_termino IS NULL
    `, [fecha_termino, motivo_termino, observaciones, guardia_id]);
    
    if (result.rowCount === 0) {
      return { 
        success: false, 
        error: 'No se encontró asignación activa para terminar' 
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error terminando asignación:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Verificar si un guardia tiene asignación activa
 * ÚTIL - Para validaciones antes de asignar
 */
export async function verificarAsignacionActiva(guardia_id: string): Promise<AsignacionActual | null> {
  return await obtenerAsignacionActual(guardia_id);
}

/**
 * Actualizar fecha de inicio de una asignación existente
 * ÚTIL - Para correcciones manuales
 */
export async function actualizarFechaInicioAsignacion(
  asignacion_id: number,
  nueva_fecha_inicio: string,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    const result = await query(`
      UPDATE historial_asignaciones_guardias 
      SET 
        fecha_inicio = $1,
        observaciones = COALESCE(observaciones, '') || ' - Fecha actualizada: ' || COALESCE($2, ''),
        updated_at = NOW()
      WHERE id = $3
    `, [nueva_fecha_inicio, observaciones, asignacion_id]);
    
    if (result.rowCount === 0) {
      return { 
        success: false, 
        error: 'No se encontró la asignación para actualizar' 
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error actualizando fecha de inicio:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
