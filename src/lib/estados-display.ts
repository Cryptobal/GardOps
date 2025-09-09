/**
 * Utilidades para mapear estados de pauta a elementos de UI
 * Implementa la lógica estándar de visualización de estados
 */

export interface EstadoDisplay {
  icon: string;
  text: string;
  className: string;
  iconColor: string;
  tooltip: string;
  badgeConfig?: {
    label: string;
    variant: string;
    color: string;
  };
}

/**
 * Mapear estado_operacion granular a display de UI
 * Basado en la especificación estándar de estados
 */
export function mapearEstadoOperacionADisplay(
  estado_operacion: string,
  plan_base?: string,
  estado_rrhh?: string,
  turno_extra_guardia_nombre?: string
): EstadoDisplay {
  
  // Información adicional para tooltip
  const infoExtra = turno_extra_guardia_nombre ? ` (TE: ${turno_extra_guardia_nombre})` : '';
  
  switch (estado_operacion) {
    // ===== DÍAS LIBRES =====
    case 'libre':
      return {
        icon: "○",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-gray-400 dark:text-gray-500 text-lg",
        tooltip: "Día Libre - No se trabaja",
        badgeConfig: {
          label: "Libre",
          variant: "secondary",
          color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200"
        }
      };

    // ===== GUARDIA ASIGNADO - SIN EVENTOS RRHH =====
    case 'asistido':
      return {
        icon: "✓",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-green-600 dark:text-green-400 text-xl font-bold",
        tooltip: "Asistió (Confirmado)",
        badgeConfig: {
          label: "Asistido",
          variant: "default",
          color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200"
        }
      };

    case 'falta_no_cubierto':
      return {
        icon: "✗",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-red-600 dark:text-red-400 text-xl font-bold",
        tooltip: "Falta Sin Cobertura",
        badgeConfig: {
          label: "Falta",
          variant: "destructive",
          color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200"
        }
      };

    case 'falta_cubierto_por_turno_extra':
      return {
        icon: "TE",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-fuchsia-600 dark:text-fuchsia-400 text-xs font-extrabold",
        tooltip: `Falta Cubierta por Turno Extra${infoExtra}`,
        badgeConfig: {
          label: "TE (Falta)",
          variant: "default",
          color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900 dark:text-fuchsia-200"
        }
      };

    // ===== PERMISOS CON GOCE =====
    case 'permiso_con_goce_no_cubierto':
      return {
        icon: "🏖",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-indigo-600 dark:text-indigo-400 text-xl",
        tooltip: "Permiso Con Goce - Sin Cobertura",
        badgeConfig: {
          label: "Permiso C/Goce",
          variant: "default",
          color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
        }
      };

    case 'permiso_con_goce_cubierto_por_turno_extra':
      return {
        icon: "🏖TE",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-indigo-600 dark:text-indigo-400 text-sm font-bold",
        tooltip: `Permiso Con Goce - Cubierto por TE${infoExtra}`,
        badgeConfig: {
          label: "Permiso C/Goce (TE)",
          variant: "default",
          color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
        }
      };

    // ===== PERMISOS SIN GOCE =====
    case 'permiso_sin_goce_no_cubierto':
      return {
        icon: "🚫",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-orange-600 dark:text-orange-400 text-xl",
        tooltip: "Permiso Sin Goce - Sin Cobertura",
        badgeConfig: {
          label: "Permiso S/Goce",
          variant: "default",
          color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200"
        }
      };

    case 'permiso_sin_goce_cubierto_por_turno_extra':
      return {
        icon: "🚫TE",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-orange-600 dark:text-orange-400 text-sm font-bold",
        tooltip: `Permiso Sin Goce - Cubierto por TE${infoExtra}`,
        badgeConfig: {
          label: "Permiso S/Goce (TE)",
          variant: "default",
          color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200"
        }
      };

    // ===== LICENCIAS =====
    case 'licencia_no_cubierto':
      return {
        icon: "🏥",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-pink-600 dark:text-pink-400 text-xl",
        tooltip: "Licencia Médica - Sin Cobertura",
        badgeConfig: {
          label: "Licencia",
          variant: "default",
          color: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200"
        }
      };

    case 'licencia_cubierto_por_turno_extra':
      return {
        icon: "🏥TE",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-pink-600 dark:text-pink-400 text-sm font-bold",
        tooltip: `Licencia Médica - Cubierta por TE${infoExtra}`,
        badgeConfig: {
          label: "Licencia (TE)",
          variant: "default",
          color: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200"
        }
      };

    // ===== PPC (PUESTO POR CUBRIR) =====
    case 'ppc_no_cubierto':
      return {
        icon: "▲",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-red-600 dark:text-red-400 text-xl font-bold",
        tooltip: "PPC - Sin Cobertura",
        badgeConfig: {
          label: "PPC Sin Cobertura",
          variant: "destructive",
          color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200"
        }
      };

    case 'ppc_cubierto_por_turno_extra':
      return {
        icon: "TE",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-fuchsia-600 dark:text-fuchsia-400 text-xs font-extrabold",
        tooltip: `PPC Cubierto por Turno Extra${infoExtra}`,
        badgeConfig: {
          label: "PPC Cubierto",
          variant: "default",
          color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200"
        }
      };

    // ===== ESTADOS LEGACY (COMPATIBILIDAD) =====
    case 'planificado':
      return {
        icon: "●",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-blue-500 dark:text-blue-300 text-xl font-bold",
        tooltip: "Turno Planificado",
        badgeConfig: {
          label: "Planificado",
          variant: "default",
          color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200"
        }
      };

    // ===== DEFAULT =====
    default:
      console.warn(`Estado desconocido: ${estado_operacion}`);
      return {
        icon: "·",
        text: "",
        className: "bg-transparent border-0",
        iconColor: "text-gray-300 dark:text-gray-600 text-lg",
        tooltip: `Estado: ${estado_operacion}`,
        badgeConfig: {
          label: "Sin definir",
          variant: "secondary",
          color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200"
        }
      };
  }
}

/**
 * Mapear estados legacy para compatibilidad hacia atrás
 */
export function mapearEstadoLegacyADisplay(estado: string, cobertura?: any, esPPC: boolean = false): EstadoDisplay {
  // Si hay cobertura, mostrar TE
  if (cobertura) {
    return {
      icon: "TE",
      text: "",
      className: "bg-transparent border-0",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-400 text-xs font-extrabold",
      tooltip: `TE: Cubierto por ${cobertura?.nombre || 'guardia'}`,
      badgeConfig: {
        label: "Turno Extra",
        variant: "default",
        color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900 dark:text-fuchsia-200"
      }
    };
  }

  const estadoNormalizado = estado?.toLowerCase() || '';
  
  switch (estadoNormalizado) {
    case "planificado":
      return mapearEstadoOperacionADisplay("planificado");
    case "libre":
    case "l":
      return mapearEstadoOperacionADisplay("libre");
    case "trabajado":
    case "a":
      return mapearEstadoOperacionADisplay("asistido");
    case "s":
    case "i":
      return esPPC ? 
        mapearEstadoOperacionADisplay("ppc_no_cubierto") : 
        mapearEstadoOperacionADisplay("falta_no_cubierto");
    case "p":
      return mapearEstadoOperacionADisplay("permiso_con_goce_no_cubierto");
    case "m":
      return mapearEstadoOperacionADisplay("licencia_no_cubierto");
    default:
      return mapearEstadoOperacionADisplay("planificado");
  }
}

/**
 * Crear tooltip enriquecido con información completa
 */
export function crearTooltipEnriquecido(
  guardiaNombre: string,
  diaNumero: number,
  diaSemana?: string,
  plan_base?: string,
  estado_rrhh?: string,
  estado_operacion?: string,
  turno_extra_guardia_nombre?: string,
  esFeriado?: boolean,
  isDiaGuardado?: boolean,
  esPPC?: boolean,
  modoEdicion?: boolean
): string {
  const partes = [
    `${guardiaNombre} - Día ${diaNumero}${diaSemana ? ` (${diaSemana})` : ''}${esFeriado ? ' - FERIADO' : ''}`,
    estado_operacion ? `Estado: ${estado_operacion}` : '',
    plan_base ? `Plan: ${plan_base}` : '',
    estado_rrhh && estado_rrhh !== 'sin_evento' ? `RRHH: ${estado_rrhh}` : '',
    turno_extra_guardia_nombre ? `TE por: ${turno_extra_guardia_nombre}` : '',
    isDiaGuardado ? '✅ Guardado en BD' : '',
    esPPC ? 'PPC' : '',
    !modoEdicion ? 'Modo solo lectura' : ''
  ].filter(Boolean);
  
  return partes.join(' - ');
}
