/**
 * Utilidades para manejar roles de servicio con series de días
 * Permite horarios variables por día en un ciclo de turno
 */

import { RolServicio, SerieDia } from '@/lib/schemas/roles-servicio';

/**
 * Obtiene el horario de un día específico en el ciclo de un rol
 * @param rol - Rol de servicio
 * @param posicionCiclo - Posición en el ciclo (1, 2, 3, 4, 5, 6, 7, 8...)
 * @returns Horario del día o fallback a horarios fijos
 */
export function obtenerHorarioDelDia(
  rol: RolServicio, 
  posicionCiclo: number
): { hora_inicio: string; hora_termino: string; horas_turno: number; es_dia_trabajo: boolean } {
  
  // Si el rol tiene horarios variables y series cargadas
  if (rol.tiene_horarios_variables && rol.series_dias && rol.series_dias.length > 0) {
    const diaSerie = rol.series_dias.find(dia => dia.posicion_en_ciclo === posicionCiclo);
    
    if (diaSerie) {
      return {
        hora_inicio: diaSerie.hora_inicio || '00:00',
        hora_termino: diaSerie.hora_termino || '00:00',
        horas_turno: diaSerie.horas_turno,
        es_dia_trabajo: diaSerie.es_dia_trabajo
      };
    }
  }
  
  // Fallback a horarios fijos (compatibilidad con roles existentes)
  return {
    hora_inicio: rol.hora_inicio,
    hora_termino: rol.hora_termino,
    horas_turno: rol.horas_turno,
    es_dia_trabajo: true // Asumir que todos los días son de trabajo en roles fijos
  };
}

/**
 * Obtiene el horario de un día específico basado en una fecha
 * @param rol - Rol de servicio
 * @param fecha - Fecha para calcular la posición en el ciclo
 * @returns Horario del día
 */
export function obtenerHorarioPorFecha(
  rol: RolServicio, 
  fecha: Date
): { hora_inicio: string; hora_termino: string; horas_turno: number; es_dia_trabajo: boolean } {
  
  // Calcular posición en el ciclo basado en la fecha
  const posicionCiclo = calcularPosicionEnCiclo(rol, fecha);
  return obtenerHorarioDelDia(rol, posicionCiclo);
}

/**
 * Calcula la posición en el ciclo basado en una fecha
 * @param rol - Rol de servicio
 * @param fecha - Fecha de referencia
 * @returns Posición en el ciclo (1, 2, 3, 4, 5, 6, 7, 8...)
 */
export function calcularPosicionEnCiclo(rol: RolServicio, fecha: Date): number {
  const duracionCiclo = rol.duracion_ciclo_dias || (rol.dias_trabajo + rol.dias_descanso);
  
  // Usar días desde una fecha base (ej: 1 de enero de 2024)
  const fechaBase = new Date('2024-01-01');
  const diasDiferencia = Math.floor((fecha.getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calcular posición en el ciclo (1-indexado)
  return (diasDiferencia % duracionCiclo) + 1;
}

/**
 * Valida que una serie de días sea consistente
 * @param seriesDias - Array de días de la serie
 * @param diasTrabajo - Días de trabajo esperados
 * @param diasDescanso - Días de descanso esperados
 * @returns Objeto con validación y errores
 */
export function validarSerieDias(
  seriesDias: SerieDia[], 
  diasTrabajo: number, 
  diasDescanso: number
): { esValida: boolean; errores: string[] } {
  const errores: string[] = [];
  const totalDias = diasTrabajo + diasDescanso;
  
  // Verificar cantidad de días
  if (seriesDias.length !== totalDias) {
    errores.push(`La serie debe tener exactamente ${totalDias} días, pero tiene ${seriesDias.length}`);
  }
  
  // Verificar posiciones únicas
  const posiciones = seriesDias.map(dia => dia.posicion_en_ciclo);
  const posicionesUnicas = new Set(posiciones);
  if (posicionesUnicas.size !== posiciones.length) {
    errores.push('Las posiciones en el ciclo deben ser únicas');
  }
  
  // Verificar rango de posiciones
  const posicionesValidas = posiciones.every(pos => pos >= 1 && pos <= totalDias);
  if (!posicionesValidas) {
    errores.push(`Las posiciones deben estar entre 1 y ${totalDias}`);
  }
  
  // Verificar días de trabajo
  const diasTrabajoEnSerie = seriesDias.filter(dia => dia.es_dia_trabajo).length;
  if (diasTrabajoEnSerie !== diasTrabajo) {
    errores.push(`Debe haber exactamente ${diasTrabajo} días de trabajo, pero hay ${diasTrabajoEnSerie}`);
  }
  
  // Verificar días de descanso
  const diasDescansoEnSerie = seriesDias.filter(dia => !dia.es_dia_trabajo).length;
  if (diasDescansoEnSerie !== diasDescanso) {
    errores.push(`Debe haber exactamente ${diasDescanso} días de descanso, pero hay ${diasDescansoEnSerie}`);
  }
  
  // Verificar horarios en días de trabajo
  for (const dia of seriesDias) {
    if (dia.es_dia_trabajo) {
      if (!dia.hora_inicio || !dia.hora_termino) {
        errores.push(`El día ${dia.posicion_en_ciclo} es de trabajo pero no tiene horarios definidos`);
      } else {
        // Validar formato de hora
        const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!horaRegex.test(dia.hora_inicio) || !horaRegex.test(dia.hora_termino)) {
          errores.push(`Formato de hora inválido en día ${dia.posicion_en_ciclo}`);
        }
      }
    } else {
      // Días de descanso no deben tener horarios
      if (dia.hora_inicio || dia.hora_termino) {
        errores.push(`El día ${dia.posicion_en_ciclo} es de descanso pero tiene horarios definidos`);
      }
    }
  }
  
  return {
    esValida: errores.length === 0,
    errores
  };
}

/**
 * Calcula la nomenclatura para un rol con horarios variables
 * @param diasTrabajo - Días de trabajo
 * @param diasDescanso - Días de descanso
 * @param seriesDias - Series de días
 * @returns Nomenclatura calculada
 */
export function calcularNomenclaturaConSeries(
  diasTrabajo: number,
  diasDescanso: number,
  seriesDias: SerieDia[]
): string {
  // Calcular promedio de horas
  const diasTrabajoEnSerie = seriesDias.filter(dia => dia.es_dia_trabajo);
  const promedioHoras = diasTrabajoEnSerie.length > 0 
    ? Math.round((diasTrabajoEnSerie.reduce((sum, dia) => sum + dia.horas_turno, 0) / diasTrabajoEnSerie.length) * 10) / 10
    : 0;
  
  // Determinar si es turno de día o noche
  const primerDiaTrabajo = diasTrabajoEnSerie[0];
  const horaInicio = primerDiaTrabajo?.hora_inicio || '08:00';
  const [horaInicioNum] = horaInicio.split(':').map(Number);
  const esTurnoDia = horaInicioNum >= 6 && horaInicioNum < 18;
  const tipoTurno = esTurnoDia ? 'D' : 'N';
  
  // Verificar si hay horarios variables
  const horariosUnicos = new Set(diasTrabajoEnSerie.map(dia => `${dia.hora_inicio}-${dia.hora_termino}`));
  const tieneHorariosVariables = horariosUnicos.size > 1;
  
  // Crear rango de horarios
  const horarios = Array.from(horariosUnicos);
  const rangoHorarios = horarios.length === 1 
    ? horarios[0].replace('-', ' ')
    : `${horarios[0].split('-')[0]}-${horarios[horarios.length - 1].split('-')[1]}`;
  
  // Agregar asterisco si hay variabilidad
  const sufijo = tieneHorariosVariables ? '*' : '';
  
  return `${tipoTurno} ${diasTrabajo}x${diasDescanso}x${promedioHoras} ${rangoHorarios}${sufijo}`;
}

/**
 * Genera una serie de días por defecto basada en patrón simple
 * @param diasTrabajo - Días de trabajo
 * @param diasDescanso - Días de descanso
 * @param horaInicio - Hora de inicio fija
 * @param horaTermino - Hora de término fija
 * @returns Array de días de la serie
 */
export function generarSeriePorDefecto(
  diasTrabajo: number,
  diasDescanso: number,
  horaInicio: string,
  horaTermino: string
): SerieDia[] {
  const serie: SerieDia[] = [];
  const totalDias = diasTrabajo + diasDescanso;
  
  for (let i = 1; i <= totalDias; i++) {
    const esDiaTrabajo = i <= diasTrabajo;
    
    serie.push({
      posicion_en_ciclo: i,
      es_dia_trabajo: esDiaTrabajo,
      hora_inicio: esDiaTrabajo ? horaInicio : undefined,
      hora_termino: esDiaTrabajo ? horaTermino : undefined,
      horas_turno: esDiaTrabajo ? calcularHorasTurno(horaInicio, horaTermino) : 0,
      observaciones: esDiaTrabajo ? `Día ${i}` : `Día libre ${i}`
    });
  }
  
  return serie;
}

/**
 * Calcula horas de turno entre dos horarios
 * @param horaInicio - Hora de inicio
 * @param horaTermino - Hora de término
 * @returns Horas de turno
 */
function calcularHorasTurno(horaInicio: string, horaTermino: string): number {
  const [horaInicioNum, minutoInicioNum] = horaInicio.split(':').map(Number);
  const [horaTerminoNum, minutoTerminoNum] = horaTermino.split(':').map(Number);
  
  let horasTurno = (horaTerminoNum - horaInicioNum) + (minutoTerminoNum - minutoInicioNum) / 60;
  
  // Manejar turnos que cruzan la medianoche
  if (horasTurno <= 0) {
    horasTurno += 24;
  }
  
  return Math.round(horasTurno * 100) / 100;
}

/**
 * Obtiene estadísticas de una serie
 * @param seriesDias - Array de días de la serie
 * @returns Estadísticas de la serie
 */
export function obtenerEstadisticasSerie(seriesDias: SerieDia[]): {
  totalDias: number;
  diasTrabajo: number;
  diasDescanso: number;
  horasPromedio: number;
  horasMinimas: number;
  horasMaximas: number;
  tieneHorariosVariables: boolean;
} {
  const diasTrabajo = seriesDias.filter(dia => dia.es_dia_trabajo);
  const horasTrabajo = diasTrabajo.map(dia => dia.horas_turno);
  
  const horariosUnicos = new Set(diasTrabajo.map(dia => `${dia.hora_inicio}-${dia.hora_termino}`));
  
  return {
    totalDias: seriesDias.length,
    diasTrabajo: diasTrabajo.length,
    diasDescanso: seriesDias.length - diasTrabajo.length,
    horasPromedio: horasTrabajo.length > 0 ? Math.round((horasTrabajo.reduce((sum, h) => sum + h, 0) / horasTrabajo.length) * 100) / 100 : 0,
    horasMinimas: horasTrabajo.length > 0 ? Math.min(...horasTrabajo) : 0,
    horasMaximas: horasTrabajo.length > 0 ? Math.max(...horasTrabajo) : 0,
    tieneHorariosVariables: horariosUnicos.size > 1
  };
}
