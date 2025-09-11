/**
 * VALIDACIONES PARA ESTADOS DE TURNOS
 * Asegura consistencia en la nueva estructura
 */

import { EstadoTurno } from './estados-turnos';

/**
 * Valida un estado de turno según las reglas de negocio
 */
export function validarEstadoTurno(estado: EstadoTurno): string[] {
  const errores: string[] = [];
  
  // Regla 1: Día libre
  if (estado.tipo_turno === 'libre') {
    if (estado.estado_guardia !== null) {
      errores.push('Día libre no puede tener estado_guardia');
    }
    if (estado.tipo_cobertura !== null) {
      errores.push('Día libre no puede tener tipo_cobertura');
    }
    if (estado.estado_puesto !== 'libre') {
      errores.push('Día libre debe tener estado_puesto = "libre"');
    }
  }
  
  // Regla 2: PPC
  if (estado.estado_puesto === 'ppc') {
    if (estado.estado_guardia !== null) {
      errores.push('PPC no puede tener estado_guardia');
    }
    if (estado.tipo_turno === 'libre') {
      errores.push('PPC no puede ser día libre');
    }
  }
  
  // Regla 3: Puesto asignado
  if (estado.estado_puesto === 'asignado') {
    if (estado.estado_guardia === null) {
      errores.push('Puesto asignado debe tener estado_guardia');
    }
    if (estado.tipo_cobertura === null) {
      errores.push('Puesto asignado debe tener tipo_cobertura');
    }
    if (estado.tipo_turno === 'libre') {
      errores.push('Puesto asignado no puede ser día libre');
    }
  }
  
  // Regla 4: Puesto libre
  if (estado.estado_puesto === 'libre') {
    if (estado.estado_guardia !== null) {
      errores.push('Puesto libre no puede tener estado_guardia');
    }
    if (estado.tipo_cobertura !== null) {
      errores.push('Puesto libre no puede tener tipo_cobertura');
    }
    if (estado.tipo_turno !== 'libre') {
      errores.push('Puesto libre debe tener tipo_turno = "libre"');
    }
  }
  
  // Regla 5: Validar valores de enum
  if (estado.tipo_turno && !['planificado', 'libre'].includes(estado.tipo_turno)) {
    errores.push(`tipo_turno inválido: ${estado.tipo_turno}`);
  }
  
  if (estado.estado_puesto && !['asignado', 'ppc', 'libre'].includes(estado.estado_puesto)) {
    errores.push(`estado_puesto inválido: ${estado.estado_puesto}`);
  }
  
  if (estado.estado_guardia && !['asistido', 'falta', 'permiso', 'vacaciones', 'licencia'].includes(estado.estado_guardia)) {
    errores.push(`estado_guardia inválido: ${estado.estado_guardia}`);
  }
  
  if (estado.tipo_cobertura && !['sin_cobertura', 'guardia_asignado', 'turno_extra'].includes(estado.tipo_cobertura)) {
    errores.push(`tipo_cobertura inválido: ${estado.tipo_cobertura}`);
  }
  
  return errores;
}

/**
 * Verifica si un estado es válido
 */
export function esEstadoValido(estado: EstadoTurno): boolean {
  return validarEstadoTurno(estado).length === 0;
}

/**
 * Crea un estado de turno válido para día libre
 */
export function crearEstadoLibre(): EstadoTurno {
  return {
    tipo_turno: 'libre',
    estado_puesto: 'libre',
    estado_guardia: null,
    tipo_cobertura: null,
    guardia_trabajo_id: null
  };
}

/**
 * Crea un estado de turno válido para PPC
 */
export function crearEstadoPPC(tipo_cobertura: 'sin_cobertura' | 'turno_extra' = 'sin_cobertura', guardia_trabajo_id: string | null = null): EstadoTurno {
  return {
    tipo_turno: 'planificado',
    estado_puesto: 'ppc',
    estado_guardia: null,
    tipo_cobertura,
    guardia_trabajo_id
  };
}

/**
 * Crea un estado de turno válido para puesto asignado
 */
export function crearEstadoAsignado(
  estado_guardia: 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia',
  tipo_cobertura: 'sin_cobertura' | 'guardia_asignado' | 'turno_extra',
  guardia_trabajo_id: string | null = null
): EstadoTurno {
  return {
    tipo_turno: 'planificado',
    estado_puesto: 'asignado',
    estado_guardia,
    tipo_cobertura,
    guardia_trabajo_id
  };
}

/**
 * Crea un estado de turno válido para planificado
 */
export function crearEstadoPlanificado(esPPC: boolean = false): EstadoTurno {
  if (esPPC) {
    return crearEstadoPPC('sin_cobertura');
  } else {
    return crearEstadoAsignado('asistido', 'guardia_asignado');
  }
}
