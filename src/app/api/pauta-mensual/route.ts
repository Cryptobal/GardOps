import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';
import { logCRUD, logError } from '@/lib/logging';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// Función para mapear estado_operacion a formato legacy del frontend
function mapearEstadoOperacionALegacy(estado_operacion: string): string {
  switch (estado_operacion) {
    case 'libre':
      return 'L';
    case 'asistido':
      return 'A';
    case 'falta_no_cubierto':
      return 'I';
    case 'falta_cubierto_por_turno_extra':
    case 'permiso_con_goce_cubierto_por_turno_extra':
    case 'permiso_sin_goce_cubierto_por_turno_extra':
    case 'licencia_cubierto_por_turno_extra':
    case 'ppc_cubierto_por_turno_extra':
      return 'R';
    case 'ppc_no_cubierto':
      return 'S';
    case 'permiso_con_goce_no_cubierto':
    case 'permiso_sin_goce_no_cubierto':
      return 'P';
    case 'licencia_no_cubierto':
      return 'M';
    case 'planificado': // MANTENER COMO PLANIFICADO (círculo azul ●)
      return 'planificado';
    default:
      console.warn(`Estado operación desconocido: ${estado_operacion}`);
      return 'planificado'; // Fallback seguro para mostrar círculo azul
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    logger.debug(`[${timestamp}] 🚀 Iniciando carga de pauta mensual`);
    
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    logger.debug(`[${timestamp}] 📥 Parámetros recibidos:`, { instalacion_id, anio, mes });

    if (!instalacion_id || !anio || !mes) {
      logger.debug(`[${timestamp}] ❌ Validación fallida: parámetros requeridos faltantes`);
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Obtener la pauta mensual desde la base de datos usando el nuevo modelo
    const pautaQueryStart = Date.now();
    const pautaResult = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.dia,
        pm.estado,
        pm.estado_ui,
        pm.meta,
        -- NUEVOS CAMPOS ESTÁNDAR
        pm.plan_base,
        pm.estado_rrhh,
        pm.estado_operacion,
        pm.guardia_asignado_id,
        pm.turno_extra_guardia_id,
        pm.turno_extra_motivo,
        pm.editado_manualmente,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id as puesto_guardia_id,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        
        -- Información de cobertura tomada desde meta (legacy)
        (pm.meta->>'cobertura_guardia_id') as cobertura_guardia_id,
        rg.nombre as cobertura_nombre,
        rg.apellido_paterno as cobertura_apellido_paterno,
        rg.apellido_materno as cobertura_apellido_materno,
        CASE 
          WHEN (pm.meta->>'te_origen') IS NOT NULL THEN (pm.meta->>'te_origen')
          WHEN (pm.meta->>'cobertura_guardia_id') IS NOT NULL AND po.es_ppc THEN 'ppc'
          WHEN (pm.meta->>'cobertura_guardia_id') IS NOT NULL THEN 'reemplazo'
          ELSE NULL
        END as tipo_cobertura,
        
        -- Información del guardia de turno extra
        te_g.nombre as turno_extra_guardia_nombre,
        te_g.apellido_paterno as turno_extra_guardia_apellido_paterno,
        te_g.apellido_materno as turno_extra_guardia_apellido_materno
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON (pm.guardia_id = g.id OR (pm.guardia_id IS NULL AND po.guardia_id = g.id))
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias rg ON rg.id::text = (pm.meta->>'cobertura_guardia_id')
      LEFT JOIN guardias te_g ON pm.turno_extra_guardia_id = te_g.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
        AND po.activo = true
      ORDER BY po.nombre_puesto, pm.dia
    `, [instalacion_id, anio, mes]);
    
    const pautaQueryEnd = Date.now();
    logger.debug(`[${timestamp}] 🐌 Query pauta mensual: ${pautaQueryEnd - pautaQueryStart}ms, ${pautaResult.rows.length} registros encontrados`);
    
    console.log(`[${timestamp}] 🔍 DEBUG - Pauta mensual encontrada:`, pautaResult.rows.length, 'registros');

    // Obtener TODOS los puestos operativos (incluyendo PPCs sin guardias asignados)
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);
    
    console.log(`[${timestamp}] 🔍 DEBUG - Puestos operativos encontrados:`, puestosResult.rows.length, 'puestos');
    
    // Si no hay puestos con guardias asignados, devolver array vacío
    if (puestosResult.rows.length === 0) {
      console.log(`[${timestamp}] ⚠️ DEBUG - No hay puestos con guardias asignados, devolviendo array vacío`);
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No hay puestos operativos con guardias asignados en esta instalación'
      });
    }

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    logger.debug(`[${timestamp}] 📅 Generando pauta para ${diasDelMes.length} días del mes`);

    // Crear pauta en el formato esperado por el frontend
    console.log(`[${timestamp}] 🔍 DEBUG - Iniciando creación de pauta para ${puestosResult.rows.length} puestos`);
    
    const pauta = puestosResult.rows.map((puesto: any) => {
      // Buscar registros de pauta para este puesto específico
      const pautaPuesto = pautaResult.rows.filter((p: any) => p.puesto_id === puesto.puesto_id);
      
      console.log(`[${timestamp}] 🔍 Puesto ${puesto.puesto_id} (${puesto.nombre_puesto}): ${pautaPuesto.length} registros encontrados`);
      
      // Crear array de días para este puesto - LÓGICA ESTÁNDAR ACTUALIZADA
      const dias = diasDelMes.map(dia => {
        const pautaDia = pautaPuesto.find((p: any) => p.dia === dia);
        
        // PRIORIDAD 1: Usar estado_operacion granular si está disponible
        if (pautaDia?.estado_operacion) {
          return mapearEstadoOperacionALegacy(pautaDia.estado_operacion);
        }
        
        // PRIORIDAD 2: Lógica legacy para compatibilidad
        const estadoUi = (pautaDia?.estado_ui || '').toLowerCase();
        const estadoDb = (pautaDia?.estado || '').toLowerCase();
        const hasCobertura = Boolean(pautaDia?.cobertura_guardia_id);
        const isTE = (pautaDia?.meta?.tipo === 'turno_extra') || hasCobertura || estadoUi === 'te';
        
        // Si es TE por meta/cobertura/estado_ui => siempre 'R'
        if (isTE) return 'R';

        // 2) Preferir estado_ui cuando existe
        if (estadoUi) {
          switch (estadoUi) {
            case 'trabajado':
            case 'a':
            case 'asistido':
              return 'A';
            case 'plan':
            case 'planificado':
              return 'planificado';
            case 'inasistencia':
              return 'I';
            case 'sin_cobertura':
              return 'S';
            case 'libre':
              return 'L';
            case 'permiso':
              return 'P';
            case 'vacaciones':
              return 'V';
            case 'licencia':
              return 'M';
            default:
              break;
          }
        }

        // 3) Fallback a estado de BD para no perder planificación planificado/libre
        switch (estadoDb) {
          case 'planificado':
            return 'planificado';
          case 'libre':
            return 'L';
          case 'trabajado':
          case 'asistido':
            return 'A';
          case 'inasistencia':
            return 'I';
          case 'permiso':
            return 'P';
          case 'vacaciones':
            return 'V';
          case 'licencia':
            return 'M';
          case 'sin_cobertura':
            return 'S';
          default:
            return '';
        }
      });

      // Crear información de cobertura por día
      const coberturaPorDia = diasDelMes.map(dia => {
        const pautaDia = pautaPuesto.find((p: any) => p.dia === dia);
        if (pautaDia?.cobertura_guardia_id) {
          return {
            guardia_id: pautaDia.cobertura_guardia_id,
            nombre: `${pautaDia.cobertura_nombre} ${pautaDia.cobertura_apellido_paterno} ${pautaDia.cobertura_apellido_materno || ''}`.trim(),
            tipo: pautaDia.tipo_cobertura // 'ppc' o 'reemplazo'
          };
        }
        return null;
      });

      return {
        id: puesto.puesto_id,
        nombre: puesto.es_ppc ? `PPC ${puesto.nombre_puesto}` : (puesto.nombre_completo || 'Sin asignar'),
        nombre_puesto: puesto.nombre_puesto,
        patron_turno: puesto.patron_turno || '4x4',
        dias: dias,
        cobertura_por_dia: coberturaPorDia, // Nueva información de cobertura
        tipo: puesto.tipo,
        es_ppc: puesto.es_ppc,
        guardia_id: puesto.guardia_id,
        rol_nombre: puesto.rol_nombre
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Generar un UUID válido para el log
    const pautaId = crypto.randomUUID();
    
    // Log de lectura de pauta mensual
    await logCRUD(
      'pauta_mensual',
      pautaId,
      'READ',
      usuario,
      null, // No hay datos anteriores en lectura
      {
        instalacion_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        total_puestos: pauta.length,
        dias_mes: diasDelMes.length,
        registros_encontrados: pautaResult.rows.length,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      },
      tenantId
    );
    
    logger.debug(`[${timestamp}] ✅ Pauta mensual cargada exitosamente`);
    logger.debug(`[${timestamp}] 📊 Resumen: ${pauta.length} puestos, ${diasDelMes.length} días por puesto`);
    logger.debug(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    return NextResponse.json({
      success: true,
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      pauta: pauta,
      metadata: {
        total_puestos: pauta.length,
        dias_mes: diasDelMes.length,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      }
    });

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Error obteniendo pauta mensual:`, error);
    
    // Log del error
    await logCRUD(
      'pauta-mensual',
      crypto.randomUUID(),
      'READ',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-mensual',
        method: 'GET',
        timestamp: errorTime
      },
      '1397e653-a702-4020-9702-3ae4f3f8b337'
    );
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener la pauta mensual',
        timestamp: errorTime,
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 