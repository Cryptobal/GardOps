/**
 * Utilidades para ordenar roles de servicio de manera inteligente
 * Agrupa roles por patrón de turno y coloca pares día/noche juntos
 */

import { RolServicio } from '@/lib/schemas/roles-servicio';

/**
 * Ordena roles de servicio agrupando por patrón y colocando día antes que noche
 * @param roles - Array de roles de servicio
 * @returns Array ordenado con pares día/noche agrupados
 */
export function ordenarRolesPorPatron(roles: RolServicio[]): RolServicio[] {
  try {
    console.log('🔄 ordenarRolesPorPatron: Ordenando', roles.length, 'roles');
    return roles.sort((a, b) => {
      try {
        // 1. Extraer patrón de turno (ej: "4x4" de "D 4x4x12 08:00 20:00")
        const patronA = extraerPatronTurno(a.nombre);
        const patronB = extraerPatronTurno(b.nombre);
        
        // 2. Primero ordenar por patrón (4x4, 5x2, 2x5, etc)
        if (patronA.patron !== patronB.patron) {
          return compararPatrones(patronA, patronB);
        }
        
        // 3. Dentro del mismo patrón: Día antes que Noche
        if (patronA.esDia !== patronB.esDia) {
          return patronA.esDia ? -1 : 1; // Día (-1) va antes que Noche (1)
        }
        
        // 4. Dentro del mismo tipo (día o noche): por horario de inicio
        if (patronA.horaInicio !== patronB.horaInicio) {
          return patronA.horaInicio.localeCompare(patronB.horaInicio);
        }
        
        // 5. Por último, orden alfabético completo
        return a.nombre.localeCompare(b.nombre);
      } catch (error) {
        console.error('❌ Error ordenando roles:', error, 'para roles:', a.nombre, b.nombre);
        return 0; // Mantener orden original si hay error
      }
    });
  } catch (error) {
    console.error('❌ Error en ordenarRolesPorPatron:', error);
    return roles; // Devolver roles sin ordenar si hay error
  }
}

/**
 * Extrae información del patrón de turno desde el nombre del rol
 * @param nombreRol - Nombre del rol (ej: "D 4x4x12 08:00 20:00")
 * @returns Objeto con información del patrón
 */
export function extraerPatronTurno(nombreRol: string): {
  patron: string;
  esDia: boolean;
  horaInicio: string;
  diasTrabajo: number;
  diasDescanso: number;
} {
  try {
    // Formato actual en producción: "Día 4x4x12 / 08:00 20:00" o "Noche 4x4x12 / 20:00 08:00"
    const matchActual = nombreRol.match(/^(Día|Noche)\s+(\d+)x(\d+)x\d+\s+\/\s+(\d{1,2}:\d{2})\s+\d{1,2}:\d{2}$/);
    
    if (matchActual) {
      const [, tipoTurno, diasTrabajo, diasDescanso, horaInicio] = matchActual;
      return {
        patron: `${diasTrabajo}x${diasDescanso}`,
        esDia: tipoTurno === 'Día',
        horaInicio,
        diasTrabajo: parseInt(diasTrabajo),
        diasDescanso: parseInt(diasDescanso)
      };
    }
    
    // Formato esperado futuro: "D 4x4x12 08:00 20:00" o "N 4x4x12 20:00 08:00"
    const matchFuturo = nombreRol.match(/^([DN])\s+(\d+)x(\d+)x\d+\s+(\d{1,2}:\d{2})\s+\d{1,2}:\d{2}$/);
    
    if (matchFuturo) {
      const [, tipoTurno, diasTrabajo, diasDescanso, horaInicio] = matchFuturo;
      return {
        patron: `${diasTrabajo}x${diasDescanso}`,
        esDia: tipoTurno === 'D',
        horaInicio,
        diasTrabajo: parseInt(diasTrabajo),
        diasDescanso: parseInt(diasDescanso)
      };
    }
    
    // Fallback para nombres que no siguen ningún patrón
    console.log('⚠️ extraerPatronTurno: No se pudo parsear el nombre:', nombreRol);
    return {
      patron: nombreRol,
      esDia: true,
      horaInicio: '00:00',
      diasTrabajo: 0,
      diasDescanso: 0
    };
  } catch (error) {
    console.error('❌ Error en extraerPatronTurno:', error, 'para nombre:', nombreRol);
    return {
      patron: nombreRol,
      esDia: true,
      horaInicio: '00:00',
      diasTrabajo: 0,
      diasDescanso: 0
    };
  }
}

/**
 * Compara patrones de turno para ordenamiento
 * Prioriza: 4x4 → 5x2 → 2x5 → otros
 */
function compararPatrones(
  patronA: ReturnType<typeof extraerPatronTurno>,
  patronB: ReturnType<typeof extraerPatronTurno>
): number {
  const prioridades: Record<string, number> = {
    '4x4': 1,
    '5x2': 2, 
    '2x5': 3
  };
  
  const prioridadA = prioridades[patronA.patron] || 999;
  const prioridadB = prioridades[patronB.patron] || 999;
  
  if (prioridadA !== prioridadB) {
    return prioridadA - prioridadB;
  }
  
  // Si tienen misma prioridad, orden alfabético del patrón
  return patronA.patron.localeCompare(patronB.patron);
}

/**
 * Agrupa roles por patrón para visualización
 * @param roles - Array de roles ordenados
 * @returns Array de grupos con roles día/noche
 */
export function agruparRolesPorPatron(roles: RolServicio[]): Array<{
  patron: string;
  rolesDia: RolServicio[];
  rolesNoche: RolServicio[];
}> {
  const grupos: Record<string, {
    patron: string;
    rolesDia: RolServicio[];
    rolesNoche: RolServicio[];
  }> = {};
  
  for (const rol of roles) {
    const info = extraerPatronTurno(rol.nombre);
    
    if (!grupos[info.patron]) {
      grupos[info.patron] = {
        patron: info.patron,
        rolesDia: [],
        rolesNoche: []
      };
    }
    
    if (info.esDia) {
      grupos[info.patron].rolesDia.push(rol);
    } else {
      grupos[info.patron].rolesNoche.push(rol);
    }
  }
  
  return Object.values(grupos).sort((a, b) => {
    const prioridades: Record<string, number> = {
      '4x4': 1,
      '5x2': 2,
      '2x5': 3
    };
    
    const prioA = prioridades[a.patron] || 999;
    const prioB = prioridades[b.patron] || 999;
    
    return prioA - prioB;
  });
}

/**
 * Extrae todos los patrones únicos de una lista de roles
 * @param roles - Array de roles de servicio
 * @returns Array de patrones únicos ordenados por prioridad
 */
export function extraerPatronesUnicos(roles: RolServicio[]): string[] {
  const patrones = new Set<string>();
  
  for (const rol of roles) {
    const info = extraerPatronTurno(rol.nombre);
    if (info.patron && info.patron !== rol.nombre) { // Excluir fallbacks
      patrones.add(info.patron);
    }
  }
  
  // Ordenar por prioridad
  const patronesArray = Array.from(patrones);
  return patronesArray.sort((a, b) => {
    const prioridades: Record<string, number> = {
      '4x4': 1,
      '5x2': 2,
      '2x5': 3,
      '6x2': 4,
      '7x7': 5
    };
    
    const prioA = prioridades[a] || 999;
    const prioB = prioridades[b] || 999;
    
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    
    // Si tienen misma prioridad, orden alfabético
    return a.localeCompare(b);
  });
}

/**
 * Filtra roles por patrón específico
 * @param roles - Array de roles de servicio
 * @param patronFiltro - Patrón a filtrar (ej: "4x4", "5x2")
 * @returns Array de roles que coinciden con el patrón
 */
export function filtrarRolesPorPatron(roles: RolServicio[], patronFiltro: string): RolServicio[] {
  if (!patronFiltro || patronFiltro === 'todos') {
    return roles;
  }
  
  return roles.filter(rol => {
    const info = extraerPatronTurno(rol.nombre);
    return info.patron === patronFiltro;
  });
}

/**
 * Detecta si un rol tiene su par de noche
 */
export function tieneParNoche(rol: any, todosLosRoles: any[]): boolean {
  const info = extraerPatronTurno(rol.nombre);
  
  // Si es turno de noche, siempre tiene par (el de día)
  if (!info.esDia) {
    return true;
  }
  
  // Si es turno de día, buscar si existe el de noche
  const parNoche = todosLosRoles.find(otroRol => {
    if (otroRol.id === rol.id) return false; // No comparar consigo mismo
    
    const otroInfo = extraerPatronTurno(otroRol.nombre);
    
    // Mismo patrón y tipo noche
    return otroInfo.patron === info.patron && !otroInfo.esDia;
  });
  
  return !!parNoche;
}

/**
 * Crea los datos para el turno de noche basado en un turno de día
 */
export function crearDatosTurnoNoche(rolDia: any): any {
  const info = extraerPatronTurno(rolDia.nombre);
  
  // Calcular horario de noche (12 horas después)
  const horaInicio = rolDia.hora_inicio;
  const horaTermino = rolDia.hora_termino;
  
  // Convertir a minutos para facilitar cálculos
  const [horaInicioH, minInicioH] = horaInicio.split(':').map(Number);
  const [horaTerminoH, minTerminoH] = horaTermino.split(':').map(Number);
  
  const minutosInicio = horaInicioH * 60 + minInicioH;
  const minutosTermino = horaTerminoH * 60 + minTerminoH;
  
  // Calcular turno de noche (12 horas después)
  let minutosInicioNoche = minutosInicio + (12 * 60); // +12 horas
  let minutosTerminoNoche = minutosTermino + (12 * 60);
  
  // Ajustar si pasa de medianoche
  if (minutosInicioNoche >= 24 * 60) minutosInicioNoche -= 24 * 60;
  if (minutosTerminoNoche >= 24 * 60) minutosTerminoNoche -= 24 * 60;
  
  // Convertir de vuelta a formato HH:MM
  const horaInicioNoche = `${Math.floor(minutosInicioNoche / 60).toString().padStart(2, '0')}:${(minutosInicioNoche % 60).toString().padStart(2, '0')}`;
  const horaTerminoNoche = `${Math.floor(minutosTerminoNoche / 60).toString().padStart(2, '0')}:${(minutosTerminoNoche % 60).toString().padStart(2, '0')}`;
  
  return {
    dias_trabajo: rolDia.dias_trabajo,
    dias_descanso: rolDia.dias_descanso,
    hora_inicio: horaInicioNoche,
    hora_termino: horaTerminoNoche,
    estado: 'Activo'
  };
}
