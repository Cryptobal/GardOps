import { query } from '@/lib/database';

/**
 * Función helper para sincronizar pautas después de asignar un guardia
 * Actualiza pauta mensual y diaria de manera segura
 */
export async function sincronizarPautasPostAsignacion(
  puestoId: string,
  guardiaId: string,
  instalacionId: string,
  rolId: string
) {
  console.log(`🔄 [SYNC] Iniciando sincronización para puesto ${puestoId}, guardia ${guardiaId}`);
  
  try {
    // Obtener información del puesto y rol
    const puestoInfo = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        rs.nombre as rol_nombre,
        rs.patron_turno,
        rs.dias_trabajo,
        rs.dias_descanso
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.id = $1
    `, [puestoId]);

    if (puestoInfo.rows.length === 0) {
      console.log(`❌ [SYNC] Puesto ${puestoId} no encontrado`);
      return { success: false, error: 'Puesto no encontrado' };
    }

    const puesto = puestoInfo.rows[0];
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth() + 1;
    const dia = fechaActual.getDate();

    console.log(`📅 [SYNC] Sincronizando para fecha: ${anio}-${mes}-${dia}`);

    // 1. Actualizar pauta mensual
    await sincronizarPautaMensual(puestoId, guardiaId, anio, mes, puesto);
    
    // 2. Actualizar pauta diaria
    await sincronizarPautaDiaria(puestoId, guardiaId, anio, mes, dia, puesto);

    console.log(`✅ [SYNC] Sincronización completada exitosamente`);
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
  console.log(`📊 [SYNC-MENSUAL] Actualizando pauta mensual para puesto ${puestoId}`);

  // Obtener días del mes
  const diasEnMes = new Date(anio, mes, 0).getDate();
  
  // Aplicar patrón de turno si existe
  const patronTurno = puesto.patron_turno || '4x4';
  const diasTrabajo = puesto.dias_trabajo || 4;
  const diasDescanso = puesto.dias_descanso || 4;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    // Determinar si el guardia trabaja este día según el patrón
    const estado = aplicarPatronTurno(patronTurno, dia, anio, mes, diasTrabajo, diasDescanso);
    
    if (estado === 'planificado') {
      // Insertar o actualizar en pauta mensual
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
        WHERE as_turnos_pauta_mensual.guardia_id IS NULL
           OR as_turnos_pauta_mensual.guardia_id = EXCLUDED.guardia_id
      `, [puestoId, guardiaId, anio, mes, dia, 'planificado', 'plan']);
    }
  }

  console.log(`✅ [SYNC-MENSUAL] Pauta mensual actualizada para ${diasEnMes} días`);
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
  console.log(`📅 [SYNC-DIARIA] Actualizando pauta diaria para puesto ${puestoId}, día ${dia}`);

  // Verificar si ya existe un registro para este día
  const pautaExistente = await query(`
    SELECT id, estado, estado_ui
    FROM as_turnos_pauta_diaria
    WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
  `, [puestoId, anio, mes, dia]);

  if (pautaExistente.rows.length > 0) {
    // Actualizar registro existente
    await query(`
      UPDATE as_turnos_pauta_diaria
      SET guardia_id = $1,
          estado = 'planificado',
          estado_ui = 'plan',
          updated_at = NOW()
      WHERE puesto_id = $2 AND anio = $3 AND mes = $4 AND dia = $5
    `, [guardiaId, puestoId, anio, mes, dia]);
    
    console.log(`✅ [SYNC-DIARIA] Registro existente actualizado`);
  } else {
    // Crear nuevo registro
    await query(`
      INSERT INTO as_turnos_pauta_diaria (
        puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [puestoId, guardiaId, anio, mes, dia, 'planificado', 'plan']);
    
    console.log(`✅ [SYNC-DIARIA] Nuevo registro creado`);
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
  console.log(`🔄 [REVERT] Revirtiendo sincronización para puesto ${puestoId}`);
  
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

    console.log(`✅ [REVERT] Sincronización revertida exitosamente`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [REVERT] Error revirtiendo sincronización:`, error);
    return { success: false, error: error.message };
  }
}
