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
  fechaInicio?: string  // ← NUEVO: Fecha desde la cual aplicar la asignación
) {
  logger.debug(`🔄 [SYNC] Iniciando sincronización CORREGIDA para puesto ${puestoId}, guardia ${guardiaId}, fecha inicio: ${fechaInicio}`);
  
  try {
    // Usar fecha de inicio si se proporciona, sino fecha actual
    const fechaBase = fechaInicio ? new Date(fechaInicio) : new Date();
    const anioInicio = fechaBase.getFullYear();
    const mesInicio = fechaBase.getMonth() + 1;
    const diaInicio = fechaBase.getDate();

    logger.debug(`📅 [SYNC] Sincronizando desde fecha: ${anioInicio}-${mesInicio}-${diaInicio}`);

    if (guardiaId === null) {
      // DESASIGNACIÓN: Marcar como PPC desde fecha de inicio hacia adelante
      logger.debug(`🗑️ [SYNC] Desasignando guardia - marcando como PPC desde ${anioInicio}-${mesInicio}-${diaInicio}`);
      
      // Calcular rango de fechas: desde fecha inicio hasta final del año
      const fechaFinAño = new Date(anioInicio, 11, 31); // 31 de diciembre
      
      // Generar todas las fechas desde inicio hasta fin de año
      const fechasParaActualizar = [];
      const fechaIteracion = new Date(fechaBase);
      
      while (fechaIteracion <= fechaFinAño) {
        fechasParaActualizar.push({
          anio: fechaIteracion.getFullYear(),
          mes: fechaIteracion.getMonth() + 1,
          dia: fechaIteracion.getDate()
        });
        fechaIteracion.setDate(fechaIteracion.getDate() + 1);
      }
      
      logger.debug(`📅 [SYNC] Actualizando ${fechasParaActualizar.length} días como PPC desde ${anioInicio}-${mesInicio}-${diaInicio}`);
      
      // Actualizar todos los días desde la fecha de inicio
      for (const fecha of fechasParaActualizar) {
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
          'planificado',           // tipo_turno (PPC planificado)
          'ppc',                  // estado_puesto (ahora es PPC)
          'ppc'                   // tipo_cobertura (PPC, no sin_cobertura)
        ]);
      }
      
      logger.debug(`✅ [SYNC] ${fechasParaActualizar.length} días actualizados como PPC`);
    } else {
      // ASIGNACIÓN: Actualizar as_turnos_pauta_mensual DESDE LA FECHA DE INICIO HACIA ADELANTE
      logger.debug(`👤 [SYNC] Asignando guardia ${guardiaId} desde ${anioInicio}-${mesInicio}-${diaInicio}`);
      
      // Calcular rango de fechas: desde fecha inicio hasta final del año
      const fechaFinAño = new Date(anioInicio, 11, 31); // 31 de diciembre
      
      // Generar todas las fechas desde inicio hasta fin de año
      const fechasParaActualizar = [];
      const fechaIteracion = new Date(fechaBase);
      
      while (fechaIteracion <= fechaFinAño) {
        fechasParaActualizar.push({
          anio: fechaIteracion.getFullYear(),
          mes: fechaIteracion.getMonth() + 1,
          dia: fechaIteracion.getDate()
        });
        fechaIteracion.setDate(fechaIteracion.getDate() + 1);
      }
      
      logger.debug(`📅 [SYNC] Actualizando ${fechasParaActualizar.length} días desde ${anioInicio}-${mesInicio}-${diaInicio}`);
      
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
      
      // Actualizar todos los días desde la fecha de inicio
      for (const fecha of fechasParaActualizar) {
        // Calcular si este día es de trabajo según el patrón
        const diaEnCiclo = ((fecha.dia - 1) % cicloCompleto) + 1;
        const esDiaTrabajo = diaEnCiclo <= diasTrabajo;
        
        if (esDiaTrabajo) {
          // DÍA DE TRABAJO: Asignar guardia como "planificado"
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
            guardiaId, 
            fecha.anio, 
            fecha.mes, 
            fecha.dia,
            'planificado',           // tipo_turno
            'asignado',              // estado_puesto (ya no es PPC)
            null,                    // estado_guardia (null = planificado, no asistido)
            'guardia_asignado',      // tipo_cobertura
            guardiaId                // guardia_trabajo_id
          ]);
        } else {
          // DÍA LIBRE: No asignar guardia, marcar como libre
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
            'libre',                 // estado_puesto (día libre)
            'sin_cobertura'          // tipo_cobertura
          ]);
        }
      }
      
      logger.debug(`✅ [SYNC] ${fechasParaActualizar.length} días actualizados con guardia ${guardiaId}`);
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
