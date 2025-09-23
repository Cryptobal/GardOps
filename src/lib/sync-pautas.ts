import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * Función helper para sincronizar pautas después de asignar un guardia
 * Actualiza pauta mensual y diaria de manera segura
 */
export async function sincronizarPautasPostAsignacion(
  puestoId: string,
  guardiaId: string | null,
  instalacionId: string,
  rolId: string,
  fechaInicio?: string  // ← Fecha desde la cual el guardia está asignado (para mostrar iniciales)
) {
  logger.debug(`🔄 [SYNC] Iniciando sincronización COMPLETA para puesto ${puestoId}, guardia ${guardiaId}, fecha inicio: ${fechaInicio}`);
  
  try {
    // Usar fecha de inicio si se proporciona, sino fecha actual
    // CORREGIDO: Parsear fecha en zona horaria local para evitar problemas de UTC
    const fechaAsignacion = fechaInicio 
      ? new Date(fechaInicio + 'T12:00:00') // Agregar hora para evitar problemas de zona horaria
      : new Date();
    
    console.log('🔴 [SYNC] DEPURANDO FECHA DE ASIGNACIÓN:', {
      fechaInicio_recibida: fechaInicio,
      fechaAsignacion_parseada: fechaAsignacion.toISOString(),
      fechaAsignacion_chile: fechaAsignacion.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
      dia_calculado: fechaAsignacion.getDate(),
      mes_calculado: fechaAsignacion.getMonth() + 1,
      anio_calculado: fechaAsignacion.getFullYear()
    });
    const anioActual = new Date().getFullYear();
    const mesActual = new Date().getMonth() + 1;

    logger.debug(`📅 [SYNC] Generando pauta completa para año ${anioActual}, asignación desde: ${fechaInicio}`);

    // Obtener información del rol para determinar días de trabajo
    const rolInfo = await query(`
      SELECT rs.dias_trabajo, rs.dias_descanso, rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.id = $1
    `, [puestoId]);
    
    const diasTrabajo = rolInfo.rows[0]?.dias_trabajo || 4;
    const diasDescanso = rolInfo.rows[0]?.dias_descanso || 4;
    const cicloCompleto = diasTrabajo + diasDescanso;
    
    logger.debug(`📊 [SYNC] Patrón de turno: ${diasTrabajo}x${diasDescanso} (ciclo de ${cicloCompleto} días)`);

    if (guardiaId === null) {
      // DESASIGNACIÓN: Generar pauta completa como PPC
      logger.debug(`🗑️ [SYNC] Desasignando guardia - generando pauta completa como PPC`);
      
      // Generar pauta completa para el año actual
      const fechaInicioAño = new Date(anioActual, 0, 1); // 1 de enero
      const fechaFinAño = new Date(anioActual, 11, 31); // 31 de diciembre
      
      const fechasParaGenerar = [];
      const fechaIteracion = new Date(fechaInicioAño);
      
      while (fechaIteracion <= fechaFinAño) {
        fechasParaGenerar.push({
          anio: fechaIteracion.getFullYear(),
          mes: fechaIteracion.getMonth() + 1,
          dia: fechaIteracion.getDate()
        });
        fechaIteracion.setDate(fechaIteracion.getDate() + 1);
      }
      
      logger.debug(`📅 [SYNC] Generando ${fechasParaGenerar.length} días como PPC`);
      
      // Generar pauta completa con patrón de turno pero como PPC
      for (const fecha of fechasParaGenerar) {
        // Calcular si este día sería de trabajo según el patrón (desde el 1 de enero para PPCs)
        const fechaActual = new Date(fecha.anio, fecha.mes - 1, fecha.dia);
        const diasTranscurridosDesdeEnero = Math.floor((fechaActual - fechaInicioAño) / (1000 * 60 * 60 * 24));
        const diaEnCiclo = (diasTranscurridosDesdeEnero % cicloCompleto) + 1;
        const esDiaTrabajo = diaEnCiclo <= diasTrabajo;
        
        console.log('🔍 [SYNC] Procesando fecha:', {
          fecha: `${fecha.anio}-${fecha.mes}-${fecha.dia}`,
          fechaActual: fechaActual.toISOString(),
          diasTranscurridosDesdeEnero,
          diaEnCiclo,
          esDiaTrabajo,
          fechaInicioRecibida: fechaInicio
        });
        
        if (esDiaTrabajo) {
          // DÍA DE TRABAJO PLANIFICADO COMO PPC
          await query(`
            INSERT INTO as_turnos_pauta_mensual (
              puesto_id, guardia_id, anio, mes, dia, 
              tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id,
              created_at, updated_at, tenant_id
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, $7, NULL, NOW(), NOW(), $8)
            ON CONFLICT (puesto_id, anio, mes, dia)
            DO UPDATE SET
              guardia_id = NULL,
              tipo_turno = EXCLUDED.tipo_turno,
              estado_puesto = EXCLUDED.estado_puesto,
              estado_guardia = NULL,
              tipo_cobertura = EXCLUDED.tipo_cobertura,
              guardia_trabajo_id = NULL,
              updated_at = NOW(),
              tenant_id = EXCLUDED.tenant_id
          `, [
            puestoId, 
            fecha.anio, 
            fecha.mes, 
            fecha.dia,
            'planificado',           // tipo_turno (día de trabajo planificado)
            'ppc',                  // estado_puesto (PPC)
            'ppc',                  // tipo_cobertura (PPC)
            '1397e653-a702-4020-9702-3ae4f3f8b337'  // tenant_id
          ]);
        } else {
          // DÍA LIBRE
          await query(`
            INSERT INTO as_turnos_pauta_mensual (
              puesto_id, guardia_id, anio, mes, dia, 
              tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id,
              created_at, updated_at
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, $7, NULL, NOW(), NOW())
            ON CONFLICT (puesto_id, anio, mes, dia)
            DO UPDATE SET
              guardia_id = NULL,
              tipo_turno = EXCLUDED.tipo_turno,
              estado_puesto = EXCLUDED.estado_puesto,
              estado_guardia = NULL,
              tipo_cobertura = EXCLUDED.tipo_cobertura,
              guardia_trabajo_id = NULL,
              updated_at = NOW()
          `, [
            puestoId, 
            fecha.anio, 
            fecha.mes, 
            fecha.dia,
            'libre',                 // tipo_turno
            'libre',                 // estado_puesto
            'libre'                  // tipo_cobertura
          ]);
        }
      }
      
      logger.debug(`✅ [SYNC] ${fechasParaGenerar.length} días generados como PPC`);
    } else {
      // ASIGNACIÓN: Generar pauta completa con guardia asignado
      logger.debug(`👤 [SYNC] Asignando guardia ${guardiaId}, pauta completa con iniciales desde ${fechaInicio}`);
      
      // Generar pauta completa para el año actual
      const fechaInicioAño = new Date(anioActual, 0, 1); // 1 de enero
      const fechaFinAño = new Date(anioActual, 11, 31); // 31 de diciembre
      
      const fechasParaGenerar = [];
      const fechaIteracion = new Date(fechaInicioAño);
      
      while (fechaIteracion <= fechaFinAño) {
        fechasParaGenerar.push({
          anio: fechaIteracion.getFullYear(),
          mes: fechaIteracion.getMonth() + 1,
          dia: fechaIteracion.getDate()
        });
        fechaIteracion.setDate(fechaIteracion.getDate() + 1);
      }
      
      logger.debug(`📅 [SYNC] Generando ${fechasParaGenerar.length} días con patrón completo`);
      
      // Generar pauta completa pero con guardia_id solo desde la fecha de asignación
      for (const fecha of fechasParaGenerar) {
        const fechaActual = new Date(fecha.anio, fecha.mes - 1, fecha.dia);
        
        // Determinar si este día es después de la fecha de asignación (para mostrar iniciales)
        const mostrarIniciales = fechaActual >= fechaAsignacion;
        
        // Calcular si este día es de trabajo según el patrón
        // IMPORTANTE: Calcular desde la fecha de asignación del guardia, no desde enero
        let esDiaTrabajo = false;
        if (mostrarIniciales) {
          // Si el día es >= fecha de asignación, calcular patrón desde fecha de asignación
          const diasTranscurridosDesdeAsignacion = Math.floor((fechaActual - fechaAsignacion) / (1000 * 60 * 60 * 24));
          const diaEnCiclo = (diasTranscurridosDesdeAsignacion % cicloCompleto) + 1;
          esDiaTrabajo = diaEnCiclo <= diasTrabajo;
          
          logger.debug(`📅 [SYNC] Día ${fecha.dia}: días desde asignación=${diasTranscurridosDesdeAsignacion}, día en ciclo=${diaEnCiclo}, es trabajo=${esDiaTrabajo}`);
        } else {
          // Si el día es < fecha de asignación, mostrar patrón genérico (PPC)
          // Calcular desde el 1 de enero para mantener consistencia visual
          const diasTranscurridosDesdeEnero = Math.floor((fechaActual - fechaInicioAño) / (1000 * 60 * 60 * 24));
          const diaEnCiclo = (diasTranscurridosDesdeEnero % cicloCompleto) + 1;
          esDiaTrabajo = diaEnCiclo <= diasTrabajo;
          
          logger.debug(`📅 [SYNC] Día ${fecha.dia} (antes de asignación): días desde enero=${diasTranscurridosDesdeEnero}, día en ciclo=${diaEnCiclo}, es trabajo=${esDiaTrabajo}`);
        }
        
        if (esDiaTrabajo) {
          // DÍA DE TRABAJO
          await query(`
            INSERT INTO as_turnos_pauta_mensual (
              puesto_id, guardia_id, anio, mes, dia, 
              tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (puesto_id, anio, mes, dia)
            DO UPDATE SET
              guardia_id = EXCLUDED.guardia_id,
              tipo_turno = EXCLUDED.tipo_turno,
              estado_puesto = EXCLUDED.estado_puesto,
              estado_guardia = EXCLUDED.estado_guardia,
              tipo_cobertura = EXCLUDED.tipo_cobertura,
              guardia_trabajo_id = EXCLUDED.guardia_trabajo_id,
              updated_at = NOW()
          `, [
            puestoId, 
            mostrarIniciales ? guardiaId : null,  // Solo asignar guardia_id desde fecha de asignación
            fecha.anio, 
            fecha.mes, 
            fecha.dia,
            'planificado',           // tipo_turno
            mostrarIniciales ? 'asignado' : 'ppc',  // estado_puesto (PPC hasta fecha de asignación)
            null,                    // estado_guardia (null = planificado)
            mostrarIniciales ? 'guardia_asignado' : 'ppc',  // tipo_cobertura
            mostrarIniciales ? guardiaId : null     // guardia_trabajo_id (para mostrar iniciales)
          ]);
        } else {
          // DÍA LIBRE
          await query(`
            INSERT INTO as_turnos_pauta_mensual (
              puesto_id, guardia_id, anio, mes, dia, 
              tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id,
              created_at, updated_at
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, $7, NULL, NOW(), NOW())
            ON CONFLICT (puesto_id, anio, mes, dia)
            DO UPDATE SET
              guardia_id = NULL,
              tipo_turno = EXCLUDED.tipo_turno,
              estado_puesto = EXCLUDED.estado_puesto,
              estado_guardia = NULL,
              tipo_cobertura = EXCLUDED.tipo_cobertura,
              guardia_trabajo_id = NULL,
              updated_at = NOW()
          `, [
            puestoId, 
            fecha.anio, 
            fecha.mes, 
            fecha.dia,
            'libre',                 // tipo_turno
            'libre',                 // estado_puesto
            'libre'                  // tipo_cobertura
          ]);
        }
      }
      
      logger.debug(`✅ [SYNC] ${fechasParaGenerar.length} días generados con patrón completo`);
    }

    return { success: true };

  } catch (error) {
    console.error(`❌ [SYNC] Error en sincronización:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincroniza la pauta mensual después de asignar un guardia
 */
async function sincronizarPautaMensual(
  puestoId: string,
  guardiaId: string,
  anio: number,
  mes: number,
  puesto: any
) {
  logger.debug(`📊 [SYNC-MENSUAL] Actualizando pauta mensual para puesto ${puestoId}`);

  try {
    // Obtener días del mes
    const diasEnMes = new Date(anio, mes, 0).getDate();
    
    // Aplicar patrón de turno si existe
    const patronTurno = puesto.patron_turno || '4x4';
    const diasTrabajo = parseInt(puesto.dias_trabajo) || 4;
    const diasDescanso = parseInt(puesto.dias_descanso) || 4;

    for (let dia = 1; dia <= diasEnMes; dia++) {
      // Verificar si ya existe una edición manual para este día
      const edicionExistente = await query(`
        SELECT estado, estado_ui, observaciones, editado_manualmente
        FROM as_turnos_pauta_mensual
        WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
      `, [puestoId, anio, mes, dia]);

      // Si ya existe una edición manual, respetarla y no aplicar patrón automático
      if (edicionExistente.rows.length > 0) {
        const registroExistente = edicionExistente.rows[0];
        
        // Solo respetar si fue editado manualmente
        if (registroExistente.editado_manualmente) {
          logger.debug(`📝 [SYNC-MENSUAL] Respetando edición manual existente para día ${dia}: estado=${registroExistente.estado}`);
          
          // Solo actualizar el guardia_id si es necesario, pero mantener el estado manual
          await query(`
            UPDATE as_turnos_pauta_mensual
            SET guardia_id = $2, updated_at = NOW()
            WHERE puesto_id = $1 AND anio = $3 AND mes = $4 AND dia = $5
          `, [puestoId, guardiaId, anio, mes, dia]);
          continue;
        }
      }

      // Determinar si el guardia trabaja este día según el patrón (solo si no hay edición manual)
      const estado = aplicarPatronTurno(patronTurno, dia, anio, mes, diasTrabajo, diasDescanso);
      
      if (estado === 'planificado') {
        // Insertar nuevo registro solo si no existe edición manual (NO marcar como editado manualmente)
        await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, editado_manualmente, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia)
          DO UPDATE SET
            guardia_id = EXCLUDED.guardia_id,
            updated_at = NOW()
        `, [puestoId, guardiaId, anio, mes, dia, 'planificado', 'plan', false]);
      }
    }

    logger.debug(`✅ [SYNC-MENSUAL] Pauta mensual actualizada para ${diasEnMes} días`);
  } catch (error) {
    console.error(`❌ [SYNC-MENSUAL] Error:`, error);
    throw error;
  }
}

/**
 * Sincroniza la pauta diaria después de asignar un guardia
 */
async function sincronizarPautaDiaria(
  puestoId: string,
  guardiaId: string,
  anio: number,
  mes: number,
  dia: number,
  puesto: any
) {
  logger.debug(`📅 [SYNC-DIARIA] Actualizando pauta diaria para puesto ${puestoId}, día ${dia}`);

  try {
    // Usar UPSERT para simplificar la lógica
    await query(`
      INSERT INTO as_turnos_pauta_diaria (
        puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (puesto_id, anio, mes, dia)
      DO UPDATE SET
        guardia_id = EXCLUDED.guardia_id,
        estado = EXCLUDED.estado,
        estado_ui = EXCLUDED.estado_ui,
        updated_at = NOW()
    `, [puestoId, guardiaId, anio, mes, dia, 'planificado', 'plan']);
    
    logger.debug(`✅ [SYNC-DIARIA] Pauta diaria actualizada exitosamente`);
  } catch (error) {
    console.error(`❌ [SYNC-DIARIA] Error:`, error);
    throw error;
  }
}

/**
 * Aplica el patrón de turno para determinar si un guardia trabaja en un día específico
 */
function aplicarPatronTurno(
  patron: string,
  dia: number,
  anio: number,
  mes: number,
  diasTrabajo: number = 4,
  diasDescanso: number = 4
): string {
  // Patrón simple 4x4 por defecto
  const cicloCompleto = diasTrabajo + diasDescanso;
  const diaEnCiclo = ((dia - 1) % cicloCompleto) + 1;
  
  if (diaEnCiclo <= diasTrabajo) {
    return 'planificado';
  } else {
    return 'libre';
  }
}

/**
 * Función para revertir sincronización en caso de error
 */
export async function revertirSincronizacionPautas(
  puestoId: string,
  guardiaIdAnterior: string | null,
  anio: number,
  mes: number,
  dia: number
) {
  logger.debug(`🔄 [REVERT] Revirtiendo sincronización para puesto ${puestoId}`);
  
  try {
    // Revertir pauta diaria
    if (guardiaIdAnterior) {
      await query(`
        UPDATE as_turnos_pauta_diaria
        SET guardia_id = $1, updated_at = NOW()
        WHERE puesto_id = $2 AND anio = $3 AND mes = $4 AND dia = $5
      `, [guardiaIdAnterior, puestoId, anio, mes, dia]);
    } else {
      await query(`
        DELETE FROM as_turnos_pauta_diaria
        WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
      `, [puestoId, anio, mes, dia]);
    }

    // Revertir pauta mensual (solo para el día específico)
    if (guardiaIdAnterior) {
      await query(`
        UPDATE as_turnos_pauta_mensual
        SET guardia_id = $1, updated_at = NOW()
        WHERE puesto_id = $2 AND anio = $3 AND mes = $4 AND dia = $5
      `, [guardiaIdAnterior, puestoId, anio, mes, dia]);
    } else {
      await query(`
        DELETE FROM as_turnos_pauta_mensual
        WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
      `, [puestoId, anio, mes, dia]);
    }

    logger.debug(`✅ [REVERT] Sincronización revertida exitosamente`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [REVERT] Error revirtiendo sincronización:`, error);
    return { success: false, error: error.message };
  }
}
