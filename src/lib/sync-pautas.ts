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
  rolId: string
) {
  logger.debug(`🔄 [SYNC] Iniciando sincronización CORREGIDA para puesto ${puestoId}, guardia ${guardiaId}`);
  
  try {
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth() + 1;
    const dia = fechaActual.getDate();

    logger.debug(`📅 [SYNC] Sincronizando para fecha: ${anio}-${mes}-${dia}`);

    if (guardiaId === null) {
      // DESASIGNACIÓN: Eliminar o marcar como PPC en as_turnos_pauta_mensual
      logger.debug(`🗑️ [SYNC] Desasignando guardia - marcando como PPC`);
      logger.debug(`🔍 [SYNC] Parámetros de desasignación:`, { puestoId, anio, mes, dia });
      
      // Primero verificar si existe el registro
      const existeRegistro = await query(`
        SELECT id, guardia_id, estado, estado_ui
        FROM as_turnos_pauta_mensual 
        WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
      `, [puestoId, anio, mes, dia]);
      
      logger.debug(`🔍 [SYNC] Registro existente:`, existeRegistro.rows);
      
      if (existeRegistro.rows.length > 0) {
        // Actualizar registro existente - usar 'libre' que es válido en la constraint
        const result = await query(`
          UPDATE as_turnos_pauta_mensual 
          SET guardia_id = NULL,
              estado = 'libre',
              estado_ui = 'ppc',
              updated_at = NOW()
          WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
          RETURNING *
        `, [puestoId, anio, mes, dia]);
        
        logger.debug(`✅ [SYNC] Registro actualizado:`, result.rows);
      } else {
        // Crear nuevo registro como PPC - usar 'libre' que es válido en la constraint
        const result = await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, created_at, updated_at
          ) VALUES ($1, NULL, $2, $3, $4, 'libre', 'ppc', NOW(), NOW())
          RETURNING *
        `, [puestoId, anio, mes, dia]);
        
        logger.debug(`✅ [SYNC] Nuevo registro PPC creado:`, result.rows);
      }
      
      logger.debug(`✅ [SYNC] Pauta mensual actualizada - guardia desasignado`);
    } else {
      // ASIGNACIÓN: Actualizar as_turnos_pauta_mensual (que es lo que lee Pauta Diaria)
      logger.debug(`👤 [SYNC] Asignando guardia ${guardiaId}`);
      await query(`
        INSERT INTO as_turnos_pauta_mensual (
          puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (puesto_id, anio, mes, dia)
        DO UPDATE SET
          guardia_id = EXCLUDED.guardia_id,
          estado = EXCLUDED.estado,
          estado_ui = EXCLUDED.estado_ui,
          updated_at = NOW()
      `, [puestoId, guardiaId, anio, mes, dia, 'planificado', 'plan']);
      
      logger.debug(`✅ [SYNC] Pauta mensual actualizada - guardia asignado`);
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
