/**
 * Resolver de Estados para Pauta Mensual
 * 
 * Implementa la lógica estándar de resolución de estados por día/puesto
 * según las reglas de precedencia definidas:
 * 
 * 1. plan_base: planificado | libre
 * 2. estado_rrhh: sin_evento | permiso_con_goce | permiso_sin_goce | licencia | finiquito_abierto  
 * 3. estado_operacion: estados finales granulares
 */

import { query } from '@/lib/db';

export interface EventoRRHH {
  tipo: 'permiso_con_goce' | 'permiso_sin_goce' | 'licencia' | 'finiquito';
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface ResolucionEstado {
  plan_base: 'planificado' | 'libre';
  guardia_asignado_id: string | null;
  estado_rrhh: 'sin_evento' | 'permiso_con_goce' | 'permiso_sin_goce' | 'licencia' | 'finiquito_abierto';
  estado_operacion: string;
  turno_extra_guardia_id: string | null;
  turno_extra_motivo: string | null;
  es_ppc: boolean;
}

/**
 * Resolver de estados puro (idempotente)
 * Dado puesto_id y fecha, determina el estado final aplicando precedencias
 */
export async function resolverEstadoDia(
  puesto_id: string, 
  fecha: string, // YYYY-MM-DD
  asistencia_registrada: boolean = false,
  turno_extra_guardia_id: string | null = null
): Promise<ResolucionEstado> {
  
  const [anio, mes, dia] = fecha.split('-').map(Number);
  
  // 1. Obtener pauta base
  const pautaResult = await query(`
    SELECT plan_base, guardia_asignado_id, guardia_id
    FROM as_turnos_pauta_mensual 
    WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
  `, [puesto_id, anio, mes, dia]);
  
  if (pautaResult.rows.length === 0) {
    throw new Error(`No existe pauta para puesto ${puesto_id} en fecha ${fecha}`);
  }
  
  const pauta = pautaResult.rows[0];
  
  // REGLA 1: Si es día libre, estado final = libre (inmutable)
  if (pauta.plan_base === 'libre') {
    return {
      plan_base: 'libre',
      guardia_asignado_id: null,
      estado_rrhh: 'sin_evento',
      estado_operacion: 'libre',
      turno_extra_guardia_id: null,
      turno_extra_motivo: null,
      es_ppc: false
    };
  }
  
  // 2. Determinar titularidad vigente
  const guardia_asignado = pauta.guardia_asignado_id;
  
  // 3. Evaluar eventos RRHH si hay guardia asignado
  let estado_rrhh: ResolucionEstado['estado_rrhh'] = 'sin_evento';
  
  if (guardia_asignado) {
    const eventosResult = await query(`
      SELECT tipo, fecha_inicio, fecha_fin
      FROM as_turnos_eventos_rrhh 
      WHERE guardia_id = $1 
        AND fecha_inicio <= $2 
        AND (fecha_fin IS NULL OR fecha_fin >= $2)
      ORDER BY 
        CASE tipo 
          WHEN 'finiquito' THEN 1
          WHEN 'licencia' THEN 2  
          WHEN 'permiso_con_goce' THEN 3
          WHEN 'permiso_sin_goce' THEN 4
        END
      LIMIT 1
    `, [guardia_asignado, fecha]);
    
    if (eventosResult.rows.length > 0) {
      const evento = eventosResult.rows[0];
      
      if (evento.tipo === 'finiquito') {
        estado_rrhh = 'finiquito_abierto';
      } else {
        estado_rrhh = evento.tipo;
      }
    }
  }
  
  // 4. Resolver estado_operacion final
  let estado_operacion: string;
  let es_ppc = false;
  let motivo_extra: string | null = null;
  
  // Si hay finiquito o no hay guardia asignado → PPC
  if (!guardia_asignado || estado_rrhh === 'finiquito_abierto') {
    es_ppc = true;
    
    if (turno_extra_guardia_id) {
      estado_operacion = 'ppc_cubierto_por_turno_extra';
      motivo_extra = 'ppc';
    } else {
      estado_operacion = 'ppc_no_cubierto';
    }
  }
  // Guardia asignado sin eventos RRHH
  else if (estado_rrhh === 'sin_evento') {
    if (asistencia_registrada) {
      estado_operacion = 'asistido';
    } else if (turno_extra_guardia_id) {
      estado_operacion = 'falta_cubierto_por_turno_extra';
      motivo_extra = 'reemplazo_falta';
    } else {
      estado_operacion = 'falta_no_cubierto';
    }
  }
  // Guardia asignado con eventos RRHH
  else {
    const base_estado = estado_rrhh.replace('_abierto', ''); // finiquito_abierto → finiquito
    
    if (turno_extra_guardia_id) {
      estado_operacion = `${base_estado}_cubierto_por_turno_extra`;
      motivo_extra = `reemplazo_${base_estado}`;
    } else {
      estado_operacion = `${base_estado}_no_cubierto`;
    }
  }
  
  return {
    plan_base: 'planificado',
    guardia_asignado_id: guardia_asignado,
    estado_rrhh,
    estado_operacion,
    turno_extra_guardia_id,
    turno_extra_motivo: motivo_extra,
    es_ppc
  };
}

/**
 * Mapear estado_operacion a estado_ui para compatibilidad con restricciones actuales de BD
 */
export function mapearEstadoOperacionAUI(estado_operacion: string): string | null {
  // Mapeo temporal hasta que se actualicen completamente las restricciones
  switch (estado_operacion) {
    case 'libre':
      return null; // Los días libres no necesitan estado_ui
    case 'asistido':
      return 'asistido';
    case 'falta_no_cubierto':
    case 'permiso_con_goce_no_cubierto':
    case 'permiso_sin_goce_no_cubierto':
    case 'licencia_no_cubierto':
    case 'ppc_no_cubierto':
      return 'sin_cobertura';
    case 'falta_cubierto_por_turno_extra':
    case 'permiso_con_goce_cubierto_por_turno_extra':
    case 'permiso_sin_goce_cubierto_por_turno_extra':
    case 'licencia_cubierto_por_turno_extra':
    case 'ppc_cubierto_por_turno_extra':
      return 'turno_extra';
    default:
      return 'plan'; // fallback
  }
}

/**
 * Aplicar resolución a un día específico en la base de datos
 */
export async function aplicarResolucionDia(
  puesto_id: string,
  fecha: string,
  resolucion: ResolucionEstado
): Promise<void> {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  
  // Mapear a estado_ui para compatibilidad
  const estado_ui = mapearEstadoOperacionAUI(resolucion.estado_operacion);
  
  await query(`
    UPDATE as_turnos_pauta_mensual 
    SET 
      plan_base = $1,
      guardia_asignado_id = $2,
      estado_rrhh = $3,
      estado_operacion = $4,
      turno_extra_guardia_id = $5,
      turno_extra_motivo = $6,
      estado_ui = $7,
      editado_manualmente = true,
      updated_at = NOW()
    WHERE puesto_id = $8 AND anio = $9 AND mes = $10 AND dia = $11
  `, [
    resolucion.plan_base,
    resolucion.guardia_asignado_id,
    resolucion.estado_rrhh,
    resolucion.estado_operacion,
    resolucion.turno_extra_guardia_id,
    resolucion.turno_extra_motivo,
    estado_ui,
    puesto_id,
    anio,
    mes,
    dia
  ]);
}
