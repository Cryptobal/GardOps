/**
 * NUEVA LÓGICA DE ESTADOS DE TURNOS
 * Elimina completamente la lógica anterior problemática
 */

export interface EstadoTurno {
  tipo_turno: 'planificado' | 'libre';
  estado_puesto: 'asignado' | 'ppc' | 'libre';
  estado_guardia: 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia' | null;
  tipo_cobertura: 'sin_cobertura' | 'guardia_asignado' | 'turno_extra' | null;
  guardia_trabajo_id: string | null;
}

export interface EstadoUI {
  estado: 'planificado' | 'asistido' | 'turno_extra' | 'sin_cobertura' | 'libre';
  icono: string;
  color: string;
  descripcion: string;
}

/**
 * Mapea un estado de turno a estado UI para frontend
 */
export function mapearAEstadoUI(estado: EstadoTurno): EstadoUI {
  // Si es día libre
  if (estado.tipo_turno === 'libre') {
    return {
      estado: 'libre',
      icono: '○',
      color: 'text-gray-400',
      descripcion: 'Día libre'
    };
  }
  
  // Si no se ha ejecutado
  if (!estado.estado_puesto) {
    return {
      estado: 'planificado',
      icono: '●',
      color: 'text-blue-600',
      descripcion: 'Planificado'
    };
  }
  
  // Si el puesto es libre
  if (estado.estado_puesto === 'libre') {
    return {
      estado: 'libre',
      icono: '○',
      color: 'text-gray-400',
      descripcion: 'Día libre'
    };
  }
  
  // Si el puesto es PPC
  if (estado.estado_puesto === 'ppc') {
    if (estado.tipo_cobertura === 'turno_extra') {
      return {
        estado: 'turno_extra',
        icono: 'TE',
        color: 'text-fuchsia-600',
        descripcion: 'Turno Extra'
      };
    }
    return {
      estado: 'sin_cobertura',
      icono: '✗',
      color: 'text-red-600',
      descripcion: 'Sin Cobertura'
    };
  }
  
  // Si el puesto tiene guardia asignado
  if (estado.estado_puesto === 'asignado') {
    if (estado.tipo_cobertura === 'turno_extra') {
      return {
        estado: 'turno_extra',
        icono: 'TE',
        color: 'text-fuchsia-600',
        descripcion: 'Turno Extra'
      };
    }
    if (estado.tipo_cobertura === 'sin_cobertura') {
      return {
        estado: 'sin_cobertura',
        icono: '✗',
        color: 'text-red-600',
        descripcion: 'Sin Cobertura'
      };
    }
    if (estado.tipo_cobertura === 'guardia_asignado') {
      return {
        estado: 'asistido',
        icono: '✓',
        color: 'text-green-600',
        descripcion: 'Asistió'
      };
    }
  }
  
  return {
    estado: 'planificado',
    icono: '●',
    color: 'text-blue-600',
    descripcion: 'Planificado'
  };
}

/**
 * Mapea estado de turno a estado legacy para pauta mensual
 */
export function mapearEstadoOperacionALegacy(estado: EstadoTurno): string {
  const estadoUI = mapearAEstadoUI(estado);
  
  switch (estadoUI.estado) {
    case 'libre':
      return 'L';
    case 'asistido':
      return 'A';
    case 'turno_extra':
      return 'R'; // R para Turno Extra en pauta mensual
    case 'sin_cobertura':
      return 'S';
    case 'planificado':
      return 'planificado';
    default:
      return 'planificado';
  }
}

/**
 * Determina si se puede deshacer un turno
 */
export function canUndo(estado: EstadoTurno): boolean {
  const estadoUI = mapearAEstadoUI(estado);
  
  // Permitir deshacer para estados ejecutados
  return ['asistido', 'turno_extra', 'sin_cobertura'].includes(estadoUI.estado);
}

/**
 * Determina si es un turno extra
 */
export function isTurnoExtra(estado: EstadoTurno): boolean {
  return estado.tipo_cobertura === 'turno_extra';
}

/**
 * Obtiene el guardia que trabajó (titular o cobertura)
 */
export function getGuardiaTrabajo(estado: EstadoTurno, guardiaTitularId: string | null): string | null {
  return estado.guardia_trabajo_id || guardiaTitularId;
}

