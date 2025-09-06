/**
 * Utilidades para calcular horas semanales y mostrar horarios de manera inteligente
 * Incluye normativa laboral chilena para jornadas excepcionales
 */

import { RolServicio } from '@/lib/schemas/roles-servicio';

export interface CalculoHorasSemanales {
  horasSemanales: number;
  tipoJornada: 'Normal' | 'Excepcional' | 'Ilegal';
  colorIndicador: 'green' | 'orange' | 'red';
  descripcion: string;
  cumpleNormativa: boolean;
}

export interface ResumenHorario {
  texto: string;
  esVariable: boolean;
  horarios: { dia: string; inicio: string; fin: string }[];
}

/**
 * Calcula las horas semanales de un rol según la normativa laboral chilena
 */
export function calcularHorasSemanales(rol: RolServicio, seriesDias?: any[]): CalculoHorasSemanales {
  let horasSemanales = 0;
  
  console.log('🔍 Calculando horas para rol:', { 
    nombre: rol.nombre, 
    tiene_horarios_variables: rol.tiene_horarios_variables,
    horas_turno: rol.horas_turno,
    dias_trabajo: rol.dias_trabajo,
    dias_descanso: rol.dias_descanso,
    duracion_ciclo_dias: rol.duracion_ciclo_dias,
    seriesDias: seriesDias?.length || 0
  });
  
  if (seriesDias && seriesDias.length > 0) {
    console.log('🔍 Series detalle:', seriesDias.map(s => ({
      posicion: s.posicion_en_ciclo,
      trabaja: s.es_dia_trabajo,
      horas: s.horas_turno,
      inicio: s.hora_inicio,
      fin: s.hora_termino
    })));
  }
  
  // Si tiene horarios variables, calcular desde las series
  if (rol.tiene_horarios_variables && seriesDias && seriesDias.length > 0) {
    const diasTrabajo = seriesDias.filter(dia => dia.es_dia_trabajo);
    const totalHorasCiclo = diasTrabajo.reduce((sum, dia) => sum + (Number(dia.horas_turno) || 0), 0);
    
    // Calcular horas por semana basado en el ciclo
    const duracionCiclo = Number(rol.duracion_ciclo_dias) || 7;
    
    // Para ciclos de 7 días, las horas del ciclo SON las horas semanales
    if (duracionCiclo === 7) {
      horasSemanales = totalHorasCiclo;
    } else {
      // Para otros ciclos, calcular proporcionalmente
      horasSemanales = Math.round((totalHorasCiclo * 7) / duracionCiclo);
    }
    
    console.log('🔍 Cálculo desde series:', { totalHorasCiclo, duracionCiclo, horasSemanales });
  } else {
    // Para horarios fijos, usar cálculo tradicional
    const horasPorDia = Number(rol.horas_turno) || 0;
    const diasTrabajo = Number(rol.dias_trabajo) || 0;
    const diasDescanso = Number(rol.dias_descanso) || 0;
    const totalDias = diasTrabajo + diasDescanso;
    
    if (totalDias > 0 && diasTrabajo > 0) {
      // Cálculo más preciso: horas por día × días de trabajo por semana
      const diasTrabajoEnSemana = (diasTrabajo * 7) / totalDias;
      horasSemanales = Math.round(horasPorDia * diasTrabajoEnSemana);
    } else {
      // Fallback simple
      horasSemanales = horasPorDia * diasTrabajo;
    }
    
    console.log('🔍 Cálculo tradicional:', { horasPorDia, diasTrabajo, diasDescanso, horasSemanales });
  }
  
  // Validar que no sea NaN
  if (isNaN(horasSemanales) || horasSemanales <= 0) {
    console.warn('⚠️ Horas semanales inválidas, usando fallback');
    horasSemanales = Number(rol.horas_turno) || 0;
  }
  
  // Determinar tipo de jornada según normativa chilena
  let tipoJornada: 'Normal' | 'Excepcional' | 'Ilegal';
  let colorIndicador: 'green' | 'orange' | 'red';
  let descripcion: string;
  let cumpleNormativa: boolean;
  
  if (horasSemanales <= 45) {
    tipoJornada = 'Normal';
    colorIndicador = 'green';
    descripcion = 'Jornada normal (≤45h/sem)';
    cumpleNormativa = true;
  } else if (horasSemanales <= 48) {
    tipoJornada = 'Excepcional';
    colorIndicador = 'orange';
    descripcion = 'Jornada excepcional (45-48h/sem)';
    cumpleNormativa = true; // Requiere autorización pero es legal
  } else {
    tipoJornada = 'Ilegal';
    colorIndicador = 'red';
    descripcion = 'Excede límite legal (>48h/sem)';
    cumpleNormativa = false;
  }
  
  return {
    horasSemanales,
    tipoJornada,
    colorIndicador,
    descripcion,
    cumpleNormativa
  };
}

/**
 * Genera un resumen inteligente de horarios para mostrar en el listado
 */
export function generarResumenHorario(rol: RolServicio, seriesDias?: any[]): ResumenHorario {
  // Si no tiene horarios variables, usar horarios fijos
  if (!rol.tiene_horarios_variables) {
    return {
      texto: `${rol.hora_inicio} - ${rol.hora_termino}`,
      esVariable: false,
      horarios: [{ dia: 'Todos', inicio: rol.hora_inicio, fin: rol.hora_termino }]
    };
  }
  
  // Si tiene horarios variables pero no hay series, mostrar información básica
  if (!seriesDias || seriesDias.length === 0) {
    return {
      texto: 'Horarios variables *',
      esVariable: true,
      horarios: [
        { dia: 'L-J', inicio: 'Horarios', fin: 'personalizados' },
        { dia: 'V', inicio: 'Por día', fin: 'del ciclo' },
        { dia: 'ℹ️', inicio: 'Configurados', fin: 'individualmente' }
      ]
    };
  }
  
  // Agrupar días por horario para crear resumen inteligente
  const diasTrabajo = seriesDias.filter(dia => dia.es_dia_trabajo);
  const gruposHorarios = new Map<string, number[]>();
  
  diasTrabajo.forEach(dia => {
    const horario = `${dia.hora_inicio}-${dia.hora_termino}`;
    if (!gruposHorarios.has(horario)) {
      gruposHorarios.set(horario, []);
    }
    gruposHorarios.get(horario)!.push(dia.posicion_en_ciclo);
  });
  
  // Generar resumen inteligente
  const resumenPartes: string[] = [];
  const horariosDetalle: { dia: string; inicio: string; fin: string }[] = [];
  
  gruposHorarios.forEach((dias, horario) => {
    const [inicio, fin] = horario.split('-');
    
    // Convertir posiciones a nombres de días
    const nombresDias = dias.map(pos => {
      if (pos <= 7) {
        const nombres = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];
        return nombres[pos] || `D${pos}`;
      }
      return `D${pos}`;
    });
    
    // Crear resumen
    if (nombresDias.length === 1) {
      resumenPartes.push(`${nombresDias[0]}: ${inicio.slice(0,2)}-${fin.slice(0,2)}`);
    } else if (nombresDias.length <= 4) {
      resumenPartes.push(`${nombresDias.join(',')}: ${inicio.slice(0,2)}-${fin.slice(0,2)}`);
    } else {
      resumenPartes.push(`${nombresDias[0]}-${nombresDias[nombresDias.length-1]}: ${inicio.slice(0,2)}-${fin.slice(0,2)}`);
    }
    
    // Agregar al detalle
    nombresDias.forEach(dia => {
      horariosDetalle.push({ dia, inicio, fin });
    });
  });
  
  return {
    texto: resumenPartes.join(', '),
    esVariable: true,
    horarios: horariosDetalle
  };
}

/**
 * Calcula horas semanales considerando colación para jornadas L-V
 */
export function calcularHorasConColacion(
  horasSemanales: number, 
  diasTrabajo: number, 
  diasDescanso: number
): number {
  // Si es jornada L-V (5x2), descontar 5 horas de colación por semana
  const esJornadaLunesViernes = diasTrabajo === 5 && diasDescanso === 2;
  
  if (esJornadaLunesViernes && horasSemanales > 40) {
    return horasSemanales - 5; // Descontar 1 hora de colación × 5 días
  }
  
  return horasSemanales;
}

/**
 * Obtiene información completa de jornada laboral
 */
export function obtenerInfoJornada(rol: RolServicio, seriesDias?: any[]) {
  const calculoBase = calcularHorasSemanales(rol, seriesDias);
  const horasConColacion = calcularHorasConColacion(
    calculoBase.horasSemanales, 
    rol.dias_trabajo, 
    rol.dias_descanso
  );
  
  const resumenHorario = generarResumenHorario(rol, seriesDias);
  
  return {
    ...calculoBase,
    horasConColacion,
    resumenHorario,
    requiereColacion: rol.dias_trabajo === 5 && rol.dias_descanso === 2
  };
}
