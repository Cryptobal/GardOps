/**
 * Utilidades para detectar roles sin símil día/noche y crear replicaciones
 */

import { RolServicio } from '@/lib/schemas/roles-servicio';

export interface RolConSimil {
  rol: RolServicio;
  tieneSimil: boolean;
  tipoSimil: 'diurno' | 'nocturno' | null;
  nomenclaturaSimil?: string;
}

/**
 * Analiza un rol y determina si tiene su símil día/noche
 */
export function analizarSimil(rol: RolServicio, todosLosRoles: RolServicio[]): RolConSimil {
  // Extraer información del rol actual
  const info = extraerInfoRol(rol.nombre);
  
  if (!info) {
    return {
      rol,
      tieneSimil: false,
      tipoSimil: null
    };
  }

  // Buscar el símil opuesto
  const tipoOpuesto = info.tipo === 'D' ? 'N' : 'D';
  const nomenclaturaSimil = `${tipoOpuesto} ${info.patron} ${info.horarios}`;
  
  // Verificar si existe el símil
  const similExiste = todosLosRoles.some(r => r.nombre === nomenclaturaSimil);
  
  return {
    rol,
    tieneSimil: similExiste,
    tipoSimil: info.tipo === 'D' ? 'nocturno' : 'diurno',
    nomenclaturaSimil: similExiste ? undefined : nomenclaturaSimil
  };
}

/**
 * Extrae información básica de la nomenclatura de un rol
 */
function extraerInfoRol(nomenclatura: string): {
  tipo: 'D' | 'N';
  patron: string;
  horarios: string;
} | null {
  try {
    // Formato: "D 4x4x12 08:00 20:00" o "D 5x2x10.4 08:00-20:00*"
    const partes = nomenclatura.split(' ');
    
    if (partes.length < 3) return null;
    
    const tipo = partes[0] as 'D' | 'N';
    const patron = partes[1]; // "4x4x12"
    const horarios = partes.slice(2).join(' '); // "08:00 20:00" o "08:00-20:00*"
    
    return { tipo, patron, horarios };
  } catch (error) {
    console.error('Error extrayendo info del rol:', error);
    return null;
  }
}

/**
 * Crea los datos para replicar un rol al símil opuesto
 */
export function crearDatosReplicacion(rolOriginal: RolServicio): any {
  const info = extraerInfoRol(rolOriginal.nombre);
  
  if (!info) {
    throw new Error('No se pudo extraer información del rol original');
  }

  // Determinar horarios opuestos
  const esOriginalDiurno = info.tipo === 'D';
  const tipoOpuesto = esOriginalDiurno ? 'N' : 'D';
  
  // Extraer horarios originales del rol
  const horariosOriginales = info.horarios.split(' ');
  const horaInicioOriginal = horariosOriginales[0];
  const horaFinOriginal = horariosOriginales[1];
  
  // Calcular horarios opuestos (invertir el turno)
  const horariosOpuestos = esOriginalDiurno 
    ? { inicio: horaFinOriginal, fin: horaInicioOriginal } // 19:00 → 07:00
    : { inicio: horaFinOriginal, fin: horaInicioOriginal }; // 07:00 → 19:00

  // Extraer patrón de días trabajo/descanso
  const patronPartes = info.patron.split('x');
  const diasTrabajo = parseInt(patronPartes[0]) || 0;
  const diasDescanso = parseInt(patronPartes[1]) || 0;
  
  const nomenclaturaOpuesta = `${tipoOpuesto} ${diasTrabajo}x${diasDescanso}x12 ${horariosOpuestos.inicio} ${horariosOpuestos.fin}`;

  return {
    nombre: nomenclaturaOpuesta,
    descripcion: `Rol ${nomenclaturaOpuesta} - Replicado de ${rolOriginal.nombre}`,
    dias_trabajo: diasTrabajo,
    dias_descanso: diasDescanso,
    hora_inicio: horariosOpuestos.inicio,
    hora_termino: horariosOpuestos.fin,
    estado: 'Activo',
    tiene_horarios_variables: false // Usar horarios fijos para réplicas simples
  };
}

/**
 * Obtiene todos los roles con información de símiles
 */
export function analizarTodosLosRoles(roles: RolServicio[]): RolConSimil[] {
  return roles.map(rol => analizarSimil(rol, roles));
}
