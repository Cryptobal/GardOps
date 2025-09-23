import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";
import { sincronizarPautasPostAsignacion, revertirSincronizacionPautas } from "@/lib/sync-pautas";
import { asignarGuardiaConFecha, verificarAsignacionActiva } from "@/lib/historial-asignaciones";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const { 
      guardia_id, 
      puesto_operativo_id, 
      confirmar_reasignacion = false,
      fecha_inicio, // NUEVO: Fecha de inicio de asignación (opcional para compatibilidad)
      motivo_inicio = 'asignacion_ppc',
      observaciones,
      eliminar_conflictos = false // NUEVO: Flag para eliminar conflictos de pauta diaria
    } = await request.json();

    console.log('🔍 [PPC/ASIGNAR] Datos recibidos:', {
      guardia_id,
      puesto_operativo_id,
      fecha_inicio,
      motivo_inicio,
      observaciones
    });

    devLogger.search(' [PPC/ASIGNAR] Iniciando asignación:', {
      guardia_id,
      puesto_operativo_id,
      confirmar_reasignacion
    });

    if (!guardia_id || !puesto_operativo_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y puesto_operativo_id' },
        { status: 400 }
      );
    }

    // SIMPLIFICADO: Verificar que el puesto existe directamente en la tabla
    console.log('🔍 [PPC/ASIGNAR] Verificando puesto...');
    let puestoCheck = await query(`
      SELECT id, instalacion_id, es_ppc, guardia_id, nombre_puesto
      FROM as_turnos_puestos_operativos 
      WHERE id = $1
    `, [puesto_operativo_id]);
    
    console.log('🔍 [PPC/ASIGNAR] Resultado puesto:', puestoCheck.rows[0] || null);

    devLogger.search(' [PPC/ASIGNAR] Resultado vista:', {
      rows: puestoCheck.rows.length,
      data: puestoCheck.rows[0] || null
    });

    // Si no se encuentra en la vista, intentar en la tabla original
    if (puestoCheck.rows.length === 0) {
      logger.debug('🔍 [PPC/ASIGNAR] No encontrado en vista, buscando en tabla...');
      puestoCheck = await query(`
        SELECT 
          po.id,
          po.instalacion_id,
          po.rol_id,
          po.es_ppc,
          po.guardia_id
        FROM as_turnos_puestos_operativos po
        WHERE po.id = $1 AND po.es_ppc = true
      `, [puesto_operativo_id]);
      
      devLogger.search(' [PPC/ASIGNAR] Resultado tabla:', {
        rows: puestoCheck.rows.length,
        data: puestoCheck.rows[0] || null
      });
    }

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado o no está disponible como PPC' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    if (puesto.guardia_id) {
      return NextResponse.json(
        { error: 'El puesto ya tiene un guardia asignado' },
        { status: 400 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id FROM guardias WHERE id = $1',
      [guardia_id]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // SIMPLIFICADO: Verificar asignación existente
    console.log('🔍 [PPC/ASIGNAR] Verificando asignación existente...');
    const asignacionExistente = await query(`
      SELECT id, instalacion_id, nombre_puesto, es_ppc
      FROM as_turnos_puestos_operativos 
      WHERE guardia_id = $1 AND es_ppc = false AND activo = true
    `, [guardia_id]);
    
    console.log('🔍 [PPC/ASIGNAR] Asignación existente:', asignacionExistente.rows[0] || 'Ninguna');

    // Si tiene asignación activa y no se confirma la reasignación, devolver error
    if (asignacionExistente.rows.length > 0 && !confirmar_reasignacion) {
      return NextResponse.json(
        { 
          error: 'El guardia ya tiene una asignación activa',
          requiere_confirmacion: true,
          asignacion_actual: asignacionExistente.rows[0]
        },
        { status: 409 }
      );
    }

    // SIMPLIFICADO: Sin transacción por ahora para debuggear
    console.log('🔍 [PPC/ASIGNAR] Iniciando asignación directa...');
    
    try {
      // Si tiene asignación activa y se confirma la reasignación, liberar el puesto actual
      if (asignacionExistente.rows.length > 0 && confirmar_reasignacion) {
        const asignacionActual = asignacionExistente.rows[0];
        logger.debug(`🔄 [REASIGNACIÓN] Liberando asignación actual del guardia ${guardia_id} en puesto ${asignacionActual.id}`);
        
        await query(`
          UPDATE as_turnos_puestos_operativos 
          SET es_ppc = true,
              guardia_id = NULL,
              actualizado_en = NOW()
          WHERE id = $1
        `, [asignacionActual.id]);
        
        logger.debug(`✅ [REASIGNACIÓN] Puesto anterior ${asignacionActual.id} liberado correctamente`);
      }

      // NUEVA LÓGICA: Asignar con historial (COMPATIBLE con lógica existente)
      const puestoIdFinal = (puestoCheck.rows.length > 0 && puestoCheck.rows[0].puesto_id) 
        ? puestoCheck.rows[0].puesto_id 
        : puesto_operativo_id;
      
      // Obtener instalación del puesto
      const puestoInfo = await query(`
        SELECT instalacion_id FROM as_turnos_puestos_operativos WHERE id = $1
      `, [puestoIdFinal]);
      
      if (puestoInfo.rows.length === 0) {
        throw new Error('Puesto no encontrado');
      }
      
      const instalacion_id = puestoInfo.rows[0].instalacion_id;
      
      console.log('🔍 [PPC/ASIGNAR] Datos para historial:', {
        guardia_id,
        instalacion_id,
        puestoIdFinal,
        fechaInicioAsignacion,
        fecha_inicio_recibida: fecha_inicio,
        fechaActualUTC: new Date().toISOString(),
        fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
      });
      
      // Usar fecha de inicio proporcionada o fecha actual como fallback (COMPATIBILIDAD)
      const fechaInicioAsignacion = fecha_inicio || new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }).split(',')[0];
      
      console.log('🔍 [PPC/ASIGNAR] Procesando fecha de inicio:', {
        fecha_inicio_recibida: fecha_inicio,
        fechaInicioAsignacion,
        fechaActualUTC: new Date().toISOString(),
        fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
        fechaActualChileISO: new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' })
      });
      
      // NUEVA VALIDACIÓN: Verificar conflictos con pauta diaria
      logger.debug(`🔍 [VALIDACIÓN] Verificando conflictos con pauta diaria desde ${fechaInicioAsignacion}...`);
      
      const conflictosResult = await query(`
        SELECT 
          pd.fecha,
          pd.estado_ui,
          pd.estado_guardia,
          g.nombre as guardia_nombre,
          g.apellido_paterno
        FROM as_turnos_pauta_diaria pd
        LEFT JOIN guardias g ON pd.guardia_id = g.id
        WHERE pd.puesto_id = $1 
          AND pd.fecha >= $2
          AND pd.estado_ui IN ('asistido', 'plan', 'trabajado', 'inasistencia')
        ORDER BY pd.fecha
      `, [puestoIdFinal, fechaInicioAsignacion]);
      
      if (conflictosResult.rows.length > 0) {
        logger.warn(`⚠️ [CONFLICTO] Se encontraron ${conflictosResult.rows.length} registros en pauta diaria`);
        
        if (!eliminar_conflictos) {
          // Mostrar modal de confirmación
          return NextResponse.json({
            success: false,
            error: 'Conflicto con pauta diaria',
            requiere_confirmacion: true,
            conflictos: conflictosResult.rows.map(row => ({
              fecha: row.fecha,
              estado: row.estado_ui,
              guardia: `${row.guardia_nombre} ${row.guardia_apellido_paterno}`.trim(),
              mensaje: `Día ${row.fecha} tiene registro de ${row.estado_ui}`
            })),
            mensaje: `Este puesto tiene ${conflictosResult.rows.length} registros en pauta diaria desde ${fechaInicioAsignacion}. ¿Desea eliminar estos registros y proceder con la asignación?`
          }, { status: 409 });
        } else {
          // Eliminar registros de pauta diaria y continuar
          logger.info(`🗑️ [ELIMINACIÓN] Eliminando ${conflictosResult.rows.length} registros de pauta diaria...`);
          
          await query(`
            DELETE FROM as_turnos_pauta_diaria 
            WHERE puesto_id = $1 
              AND fecha >= $2
              AND estado_ui IN ('asistido', 'plan', 'trabajado', 'inasistencia')
          `, [puestoIdFinal, fechaInicioAsignacion]);
          
          logger.info(`✅ [ELIMINACIÓN] Registros de pauta diaria eliminados exitosamente`);
        }
      }
      
      logger.debug(`✅ [VALIDACIÓN] No se encontraron conflictos con pauta diaria`);
      
      // FALLBACK TEMPORAL: Usar lógica legacy + registrar en historial por separado
      try {
        // 1. Asignación legacy (GARANTIZADA)
        await query(`
          UPDATE as_turnos_puestos_operativos 
          SET 
            guardia_id = $1,
            es_ppc = false,
            actualizado_en = NOW()
          WHERE id = $2
        `, [guardia_id, puestoIdFinal]);
        
        logger.debug(`✅ [ASIGNACIÓN LEGACY] Guardia ${guardia_id} asignado al puesto ${puestoIdFinal}`);
        
        // 2. Registrar en historial (OPCIONAL - no falla si hay error)
        try {
          await query(`
            INSERT INTO historial_asignaciones_guardias (
              guardia_id, instalacion_id, puesto_id, fecha_inicio,
              tipo_asignacion, motivo_inicio, estado, observaciones
            ) VALUES ($1, $2, $3, $4, 'fija', $5, 'activa', $6)
          `, [guardia_id, instalacion_id, puestoIdFinal, fechaInicioAsignacion, motivo_inicio, observaciones]);
          
          logger.debug(`✅ [HISTORIAL] Asignación registrada en historial desde ${fechaInicioAsignacion}`);
        } catch (historialError) {
          logger.warn(`⚠️ [HISTORIAL] No se pudo registrar en historial, pero asignación exitosa:`, historialError);
        }
        
      } catch (legacyError) {
        throw new Error(`Error en asignación legacy: ${legacyError}`);
      }

      logger.debug(`✅ [ASIGNACIÓN] Guardia ${guardia_id} asignado al puesto ${puesto_operativo_id}`);

      // REHABILITADO: Sincronización de pautas CORREGIDA CON FECHA DE INICIO
      logger.debug(`🔄 [SYNC] Iniciando sincronización de pautas desde ${fechaInicioAsignacion}...`);
      const syncResult = await sincronizarPautasPostAsignacion(
        puesto_operativo_id,
        guardia_id,
        puesto.instalacion_id,
        puesto.rol_id,
        fechaInicioAsignacion  // ← NUEVO: Pasar fecha de inicio
      );

      if (!syncResult.success) {
        console.error(`❌ [SYNC] Error en sincronización:`, syncResult.error);
        // NO fallar la asignación principal por error de sincronización
        // Solo loggear el error para debugging
        logger.warn(`⚠️ [SYNC] Asignación completada pero sincronización falló: ${syncResult.error}`);
      } else {
        logger.debug(`✅ [SYNC] Pautas sincronizadas exitosamente - visible en Pauta Diaria`);
      }

      // Confirmar transacción
      await query('COMMIT');
      logger.debug(`✅ [TRANSACCIÓN] Reasignación completada exitosamente`);
      
    } catch (transactionError) {
      // Revertir cambios en caso de error
      await query('ROLLBACK');
      console.error(`❌ [TRANSACCIÓN] Error en reasignación, cambios revertidos:`, transactionError);
      throw transactionError;
    }

    logger.debug(`✅ Guardia ${guardia_id} asignado al puesto ${puesto_operativo_id}`);

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado correctamente al puesto',
      asignacion_anterior: asignacionExistente.rows[0] || null,
      nueva_asignacion: {
        guardia_id,
        puesto_operativo_id,
        instalacion_id: puesto.instalacion_id,
        rol_id: puesto.rol_id
      }
    });

  } catch (error) {
    logger.error('Error asignando guardia al puesto::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 