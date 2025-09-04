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
  return roles.sort((a, b) => {
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
  });
}

/**
 * Extrae información del patrón de turno desde el nombre del rol
 * @param nombreRol - Nombre del rol (ej: "D 4x4x12 08:00 20:00")
 * @returns Objeto con información del patrón
 */
function extraerPatronTurno(nombreRol: string): {
  patron: string;
  esDia: boolean;
  horaInicio: string;
  diasTrabajo: number;
  diasDescanso: number;
} {
  // Formato esperado: "D 4x4x12 08:00 20:00" o "N 4x4x12 20:00 08:00"
  const match = nombreRol.match(/^([DN])\s+(\d+)x(\d+)x\d+\s+(\d{1,2}:\d{2})\s+\d{1,2}:\d{2}$/);
  
  if (!match) {
    // Fallback para nombres que no siguen el patrón
    return {
      patron: nombreRol,
      esDia: true,
      horaInicio: '00:00',
      diasTrabajo: 0,
      diasDescanso: 0
    };
  }
  
  const [, tipoTurno, diasTrabajo, diasDescanso, horaInicio] = match;
  
  return {
    patron: `${diasTrabajo}x${diasDescanso}`,
    esDia: tipoTurno === 'D',
    horaInicio,
    diasTrabajo: parseInt(diasTrabajo),
    diasDescanso: parseInt(diasDescanso)
  };
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
