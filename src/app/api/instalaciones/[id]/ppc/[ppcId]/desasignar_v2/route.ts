import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sincronizarPautasPostAsignacion } from '@/lib/sync-pautas';
import { terminarAsignacionActual } from '@/lib/historial-asignaciones';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  logger.debug("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2");
  
  try {
    const instalacionId = params.id;
    const ppcId = params.ppcId;

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT po.id, po.guardia_id, po.es_ppc, po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.instalacion_id = $2
    `, [ppcId, instalacionId]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puestoData = puestoCheck.rows[0];
    const guardiaId = puestoData.guardia_id;

    if (!guardiaId) {
      return NextResponse.json(
        { error: 'El puesto no tiene un guardia asignado' },
        { status: 400 }
      );
    }

    console.log('🔍 [DESASIGNAR] Iniciando desasignación:', {
      guardiaId,
      ppcId,
      instalacionId
    });

    // 1. Terminar asignación en historial (NUEVO SISTEMA) - FECHA LOCAL CHILE
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaTermino = `${año}-${mes}-${dia}`;
    
    console.log('🔍 [DESASIGNAR] Fecha de término calculada:', {
      fechaTermino,
      fechaActual: hoy.toLocaleDateString('es-CL')
    });
    
    const resultadoHistorial = await terminarAsignacionActual(
      guardiaId,
      fechaTermino,
      'desasignacion_manual',
      'Desasignado desde instalaciones'
    );
    
    if (resultadoHistorial.success) {
      console.log('✅ [DESASIGNAR] Historial actualizado con fecha de término');
    } else {
      console.warn('⚠️ [DESASIGNAR] No se pudo actualizar historial:', resultadoHistorial.error);
    }

    // 2. Liberar puesto operativo (LÓGICA LEGACY - SIN TRANSACCIÓN)
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = true,
          guardia_id = NULL,
          actualizado_en = NOW()
      WHERE id = $1
      RETURNING *
    `, [ppcId]);
    
    console.log('✅ [DESASIGNAR] Puesto liberado correctamente');

    // 3. LIMPIAR SOLO LOS REGISTROS DEL GUARDIA DESASIGNADO - NO REGENERAR PAUTA COMPLETA
    console.log('🔄 [DESASIGNAR] Limpiando registros del guardia desasignado...');
    try {
      // Solo limpiar los registros donde este guardia estaba asignado
      const registrosDelGuardia = await query(`
        UPDATE as_turnos_pauta_mensual 
        SET guardia_id = NULL,
            estado_puesto = 'ppc',
            estado_guardia = NULL,
            tipo_cobertura = 'ppc',
            guardia_trabajo_id = NULL,
            updated_at = NOW()
        WHERE puesto_id = $1 AND guardia_id = $2
        RETURNING id, anio, mes, dia
      `, [ppcId, guardiaId]);
      
      console.log(`✅ [DESASIGNAR] Limpiados ${registrosDelGuardia.rows.length} registros del guardia desasignado`);
      
      if (registrosDelGuardia.rows.length > 0) {
        console.log('🔍 [DESASIGNAR] Registros limpiados:', registrosDelGuardia.rows.map(r => `${r.anio}-${r.mes}-${r.dia}`));
      }
    } catch (error) {
      console.error('❌ [DESASIGNAR] Error limpiando registros del guardia:', error);
      // No fallar la operación principal
    }

    // 4. LIMPIAR REGISTROS FANTASMA ADICIONALES - NUEVA FUNCIONALIDAD
    console.log('🧹 [DESASIGNAR] Limpiando registros fantasma adicionales...');
    try {
      // Buscar y limpiar otros registros fantasma del mismo guardia para hoy
      const registrosFantasma = await query(`
        SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.estado, pm.estado_ui, pm.anio, pm.mes, pm.dia,
               po.nombre_puesto, po.guardia_id as puesto_guardia_id, po.es_ppc, po.instalacion_id,
               i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE pm.guardia_id = $1 AND pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 10
          AND pm.guardia_id IS NOT NULL
          AND (po.guardia_id IS NULL OR po.guardia_id != pm.guardia_id OR po.es_ppc = true)
      `, [guardiaId]);
      
      if (registrosFantasma.rows.length > 0) {
        console.log(`🧹 [DESASIGNAR] Encontrados ${registrosFantasma.rows.length} registros fantasma adicionales`);
        
        for (const registro of registrosFantasma.rows) {
          console.log(`🧹 [DESASIGNAR] Limpiando fantasma: ${registro.instalacion_nombre} - ${registro.nombre_puesto}`);
          
          // Limpiar el registro fantasma
          await query(`
            UPDATE as_turnos_pauta_mensual 
            SET guardia_id = NULL,
                estado = 'libre',
                estado_ui = 'ppc',
                updated_at = NOW()
            WHERE id = $1
          `, [registro.id]);
        }
        
        console.log('✅ [DESASIGNAR] Registros fantasma limpiados correctamente');
      } else {
        console.log('✅ [DESASIGNAR] No se encontraron registros fantasma adicionales');
      }
    } catch (error) {
      console.error('❌ [DESASIGNAR] Error limpiando registros fantasma:', error);
      // No fallar la operación principal
    }

    logger.debug(`✅ Guardia ${guardiaId} desasignado del puesto ${ppcId} correctamente`);

    return NextResponse.json({
      success: true,
      message: 'Guardia desasignado correctamente',
      puesto: result.rows[0]
    });

  } catch (error) {
    logger.error('Error desasignando guardia específico v2::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 