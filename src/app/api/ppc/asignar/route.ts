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
      observaciones
    } = await request.json();

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

    // Verificar que el puesto operativo existe y está disponible como PPC
    // Primero intentar en la vista de pauta diaria (para PPCs del módulo PPC)
    logger.debug('🔍 [PPC/ASIGNAR] Buscando PPC en vista...');
    let puestoCheck = await query(`
      SELECT 
        pauta_id,
        puesto_id,
        instalacion_id,
        rol_id,
        es_ppc,
        guardia_titular_id as guardia_id
      FROM as_turnos_v_pauta_diaria_dedup_fixed
      WHERE puesto_id = $1 AND es_ppc = true AND estado_ui = 'plan'
    `, [puesto_operativo_id]);

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

    // Verificar si el guardia ya tiene una asignación activa
    const asignacionExistente = await query(`
      SELECT 
        po.id, 
        po.instalacion_id, 
        po.rol_id,
        po.nombre_puesto,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.guardia_id = $1 AND po.es_ppc = false
    `, [guardia_id]);

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

    // Ejecutar reasignación con transacción para garantizar consistencia
    await query('BEGIN');
    
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
      
      // Usar fecha de inicio proporcionada o fecha actual como fallback (COMPATIBILIDAD)
      const fechaInicioAsignacion = fecha_inicio || new Date().toISOString().split('T')[0];
      
      // Asignar usando nueva función con historial
      const resultadoAsignacion = await asignarGuardiaConFecha(
        guardia_id,
        puestoIdFinal,
        instalacion_id,
        fechaInicioAsignacion,
        'fija',
        motivo_inicio,
        observaciones
      );
      
      if (!resultadoAsignacion.success) {
        throw new Error(`Error en asignación con historial: ${resultadoAsignacion.error}`);
      }
      
      logger.debug(`✅ [ASIGNACIÓN CON HISTORIAL] Guardia ${guardia_id} asignado al puesto ${puestoIdFinal} desde ${fechaInicioAsignacion}`);

      logger.debug(`✅ [ASIGNACIÓN] Guardia ${guardia_id} asignado al puesto ${puesto_operativo_id}`);

      // REHABILITADO: Sincronización de pautas CORREGIDA
      logger.debug(`🔄 [SYNC] Iniciando sincronización de pautas...`);
      const syncResult = await sincronizarPautasPostAsignacion(
        puesto_operativo_id,
        guardia_id,
        puesto.instalacion_id,
        puesto.rol_id
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