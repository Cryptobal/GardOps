import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 Obteniendo KPIs de instalaciones...');

    // Obtener KPIs de instalaciones con manejo de errores
    let instalacionesActivas = 0;
    let puestosActivos = 0;
    let ppcActivos = 0;
    let documentosVencidos = 0;

    try {
      // Verificar si la tabla instalaciones existe y obtener datos
      const instalacionesResult = await query(`
        SELECT 
          COUNT(*) as total_instalaciones,
          COUNT(CASE WHEN estado = 'Activo' THEN 1 END) as instalaciones_activas,
          COUNT(CASE WHEN estado = 'Inactivo' THEN 1 END) as instalaciones_inactivas
        FROM instalaciones
      `);
      
      instalacionesActivas = parseInt(instalacionesResult.rows[0]?.instalaciones_activas) || 0;
      devLogger.success(' Instalaciones activas:', instalacionesActivas);
    } catch (error) {
      console.error('❌ Error obteniendo instalaciones:', error);
    }

    try {
      // Obtener puestos activos - solo los que están realmente activos
      const puestosResult = await query(`
        SELECT COUNT(*) as puestos_activos
        FROM as_turnos_puestos_operativos po
        WHERE po.activo = true 
        AND po.instalacion_id IN (
          SELECT id FROM instalaciones WHERE estado = 'Activo'
        )
      `);
      
      puestosActivos = parseInt(puestosResult.rows[0]?.puestos_activos) || 0;
      devLogger.success(' Puestos activos (solo en instalaciones activas):', puestosActivos);
    } catch (error) {
      console.error('❌ Error obteniendo puestos:', error);
      // Intentar con tabla alternativa si existe
      try {
        const puestosAltResult = await query(`
          SELECT COUNT(*) as puestos_activos
          FROM puestos_operativos po
          WHERE po.activo = true 
          AND po.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo'
          )
        `);
        puestosActivos = parseInt(puestosAltResult.rows[0]?.puestos_activos) || 0;
        devLogger.success(' Puestos activos (tabla alternativa):', puestosActivos);
      } catch (altError) {
        console.error('❌ Error con tabla alternativa:', altError);
      }
    }

    try {
      // Obtener PPC activos - solo los que están realmente activos
      const ppcResult = await query(`
        SELECT COUNT(*) as ppc_activos
        FROM as_turnos_puestos_operativos po
        WHERE po.activo = true 
        AND po.es_ppc = true
        AND po.instalacion_id IN (
          SELECT id FROM instalaciones WHERE estado = 'Activo'
        )
      `);
      
      ppcActivos = parseInt(ppcResult.rows[0]?.ppc_activos) || 0;
      devLogger.success(' PPC activos (solo en instalaciones activas):', ppcActivos);
    } catch (error) {
      console.error('❌ Error obteniendo PPC:', error);
      // Intentar con tabla alternativa
      try {
        const ppcAltResult = await query(`
          SELECT COUNT(*) as ppc_activos
          FROM puestos_operativos po
          WHERE po.activo = true 
          AND po.es_ppc = true
          AND po.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo'
          )
        `);
        ppcActivos = parseInt(ppcAltResult.rows[0]?.ppc_activos) || 0;
        devLogger.success(' PPC activos (tabla alternativa):', ppcActivos);
      } catch (altError) {
        console.error('❌ Error con tabla alternativa PPC:', altError);
      }
    }

    try {
      // Obtener documentos vencidos - intentar diferentes tablas
      let documentosResult;
      try {
        documentosResult = await query(`
          SELECT COUNT(*) as documentos_vencidos
          FROM documentos_instalaciones di
          INNER JOIN instalaciones i ON di.instalacion_id = i.id
          WHERE di.fecha_vencimiento < NOW() AT TIME ZONE 'America/Santiago'
          AND i.estado = 'Activo'
        `);
      } catch (error) {
        // Intentar con tabla alternativa
        documentosResult = await query(`
          SELECT COUNT(*) as documentos_vencidos
          FROM documentos d
          WHERE d.tipo = 'instalacion' 
          AND d.fecha_vencimiento < NOW() AT TIME ZONE 'America/Santiago'
          AND d.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo'
          )
        `);
      }
      
      documentosVencidos = parseInt(documentosResult.rows[0]?.documentos_vencidos) || 0;
      devLogger.success(' Documentos vencidos (solo en instalaciones activas):', documentosVencidos);
    } catch (error) {
      console.error('❌ Error obteniendo documentos vencidos:', error);
    }

    const kpis = {
      instalaciones_activas: instalacionesActivas,
      puestos_activos: puestosActivos,
      ppc_activos: ppcActivos,
      documentos_vencidos: documentosVencidos
    };

    console.log('📊 KPIs finales (solo activos):', kpis);

    return NextResponse.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('❌ Error general obteniendo KPIs de instalaciones:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener KPIs',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 