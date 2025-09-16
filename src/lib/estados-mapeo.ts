/**
 * MIGRACIÓN COMPLETA A CAMPOS NUEVOS
 * Funciones para mapear entre campos legacy y nuevos
 */

export interface EstadoLegacy {
  estado: string;
  estado_ui: string;
}

export interface EstadoNuevo {
  tipo_turno: 'planificado' | 'libre';
  estado_puesto: 'asignado' | 'ppc' | 'libre';
  estado_guardia: 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia' | null;
  tipo_cobertura: 'sin_cobertura' | 'guardia_asignado' | 'turno_extra' | null;
}

/**
 * Convierte campos legacy a campos nuevos
 */
export function convertirLegacyANuevo(legacy: EstadoLegacy): EstadoNuevo {
  const { estado, estado_ui } = legacy;
  
  // Si es día libre
  if (estado === 'libre' || estado_ui === 'libre') {
    return {
      tipo_turno: 'libre',
      estado_puesto: 'libre',
      estado_guardia: null,
      tipo_cobertura: null
    };
  }
  
  // Si es sin cobertura
  if (estado === 'sin_cobertura' || estado_ui === 'sin_cobertura') {
    return {
      tipo_turno: 'planificado',
      estado_puesto: 'ppc',
      estado_guardia: null,
      tipo_cobertura: 'sin_cobertura'
    };
  }
  
  // Si es trabajado/asistido
  if (estado === 'trabajado' || estado_ui === 'trabajado' || estado_ui === 'asistido') {
    return {
      tipo_turno: 'planificado',
      estado_puesto: 'asignado',
      estado_guardia: 'asistido',
      tipo_cobertura: 'guardia_asignado'
    };
  }
  
  // Si es inasistencia
  if (estado === 'inasistencia' || estado_ui === 'inasistencia') {
    return {
      tipo_turno: 'planificado',
      estado_puesto: 'asignado',
      estado_guardia: 'falta',
      tipo_cobertura: 'sin_cobertura'
    };
  }
  
  // Si es reemplazo
  if (estado === 'reemplazo' || estado_ui === 'reemplazo') {
    return {
      tipo_turno: 'planificado',
      estado_puesto: 'asignado',
      estado_guardia: 'falta',
      tipo_cobertura: 'turno_extra'
    };
  }
  
  // Si es turno extra
  if (estado_ui === 'extra' || estado_ui === 'te' || estado_ui === 'turno_extra') {
    return {
      tipo_turno: 'planificado',
      estado_puesto: 'ppc',
      estado_guardia: null,
      tipo_cobertura: 'turno_extra'
    };
  }
  
  // Por defecto: planificado
  return {
    tipo_turno: 'planificado',
    estado_puesto: 'asignado',
    estado_guardia: 'asistido',
    tipo_cobertura: 'guardia_asignado'
  };
}

/**
 * Convierte campos nuevos a estado UI para frontend
 */
export function convertirNuevoAUI(nuevo: EstadoNuevo): string {
  const { tipo_turno, estado_puesto, estado_guardia, tipo_cobertura } = nuevo;
  
  // Si es día libre
  if (tipo_turno === 'libre') return 'libre';
  
  // Si el puesto está libre
  if (estado_puesto === 'libre') return 'libre';
  
  // Si es PPC sin cobertura
  if (estado_puesto === 'ppc' && tipo_cobertura === 'sin_cobertura') return 'sin_cobertura';
  
  // Si es PPC con turno extra
  if (estado_puesto === 'ppc' && tipo_cobertura === 'turno_extra') return 'turno_extra';
  
  // Si hay guardia asignado
  if (estado_puesto === 'asignado') {
    if (tipo_cobertura === 'turno_extra') return 'turno_extra';
    if (tipo_cobertura === 'sin_cobertura') return 'sin_cobertura';
    if (estado_guardia === 'asistido') return 'asistido';
    if (estado_guardia === 'falta') return 'sin_cobertura';
    return 'planificado'; // Aún no ejecutado
  }
  
  return 'planificado'; // Por defecto
}

/**
 * Migra un registro de legacy a campos nuevos
 */
export function migrarRegistro(registro: any): any {
  const estadoNuevo = convertirLegacyANuevo({
    estado: registro.estado,
    estado_ui: registro.estado_ui
  });
  
  return {
    ...registro,
    ...estadoNuevo
  };
}

