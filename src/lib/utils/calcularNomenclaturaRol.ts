/**
 * Calcula la nomenclatura automática de un rol de servicio
 * Formato: "D 4x4x12 8:00 20:00"
 * 
 * @param diasTrabajo - Días de trabajo consecutivos
 * @param diasDescanso - Días de descanso consecutivos
 * @param horaInicio - Hora de inicio del turno (formato HH:MM)
 * @param horaTermino - Hora de término del turno (formato HH:MM)
 * @returns Nomenclatura calculada del rol
 */
export function calcularNomenclaturaRol(
  diasTrabajo: number,
  diasDescanso: number,
  horaInicio: string,
  horaTermino: string
): string {
  // Validar parámetros
  if (diasTrabajo <= 0 || diasDescanso <= 0) {
    throw new Error('Los días de trabajo y descanso deben ser mayores a 0');
  }

  // Validar formato de hora
  const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!horaRegex.test(horaInicio) || !horaRegex.test(horaTermino)) {
    throw new Error('Formato de hora inválido. Use HH:MM');
  }

  // Calcular horas de turno automáticamente
  const [horaInicioNum, minutoInicioNum] = horaInicio.split(':').map(Number);
  const [horaTerminoNum, minutoTerminoNum] = horaTermino.split(':').map(Number);
  
  let horasTurno = (horaTerminoNum - horaInicioNum) + (minutoTerminoNum - minutoInicioNum) / 60;
  
  // Manejar turnos que cruzan la medianoche
  if (horasTurno <= 0) {
    horasTurno += 24;
  }

  // Determinar si es turno de día o noche
  const horaInicioNumero = horaInicioNum;
  const esTurnoDia = horaInicioNumero >= 6 && horaInicioNumero < 18;
  const tipoTurno = esTurnoDia ? 'D' : 'N';

  // Formatear la nomenclatura con horas de turno
  const nomenclatura = `${tipoTurno} ${diasTrabajo}x${diasDescanso}x${Math.round(horasTurno)} ${horaInicio} ${horaTermino}`;

  return nomenclatura;
}

/**
 * Calcula las horas de turno basado en hora de inicio y término
 */
export function calcularHorasTurno(horaInicio: string, horaTermino: string): number {
  const [horaInicioNum, minutoInicioNum] = horaInicio.split(':').map(Number);
  const [horaTerminoNum, minutoTerminoNum] = horaTermino.split(':').map(Number);
  
  let horasTurno = (horaTerminoNum - horaInicioNum) + (minutoTerminoNum - minutoInicioNum) / 60;
  
  // Manejar turnos que cruzan la medianoche
  if (horasTurno <= 0) {
    horasTurno += 24;
  }
  
  return Math.round(horasTurno * 100) / 100; // Redondear a 2 decimales
}

/**
 * Valida si una nomenclatura de rol es válida
 * @param nomenclatura - Nomenclatura a validar
 * @returns true si es válida, false en caso contrario
 */
export function validarNomenclaturaRol(nomenclatura: string): boolean {
  try {
    // Formato esperado: "D 4x4x12 8:00 20:00" o "N 4x4x12 20:00 8:00"
    const regex = /^[DN]\s+\d+x\d+x\d+\s+\d{1,2}:\d{2}\s+\d{1,2}:\d{2}$/;
    return regex.test(nomenclatura);
  } catch {
    return false;
  }
}

/**
 * Extrae los parámetros de una nomenclatura de rol
 * @param nomenclatura - Nomenclatura del rol
 * @returns Objeto con los parámetros extraídos
 */
export function extraerParametrosNomenclatura(nomenclatura: string): {
  tipoTurno: 'D' | 'N';
  diasTrabajo: number;
  diasDescanso: number;
  horasTurno: number;
  horaInicio: string;
  horaTermino: string;
} {
  if (!validarNomenclaturaRol(nomenclatura)) {
    throw new Error('Nomenclatura inválida');
  }

  const partes = nomenclatura.split(' ');
  const tipoTurno = partes[0] as 'D' | 'N';
  const patron = partes[1];
  const horario = partes.slice(2).join(' ');

  const [diasTrabajo, diasDescanso, horasTurno] = patron.split('x').map(Number);
  const [horaInicio, horaTermino] = horario.split(' ');

  return {
    tipoTurno,
    diasTrabajo,
    diasDescanso,
    horasTurno,
    horaInicio,
    horaTermino
  };
}
