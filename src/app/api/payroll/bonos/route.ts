import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener bonos disponibles
export async function GET(request: NextRequest) {
  logger.debug('🔍 GET /api/payroll/bonos - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      logger.debug('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    logger.debug('✅ Permisos verificados correctamente');
  } catch (error) {
    logger.warn(' Error verificando permisos:', error);
  }

  try {
    // Obtener bonos disponibles
    const bonosQuery = `
      SELECT 
        id,
        nombre,
        descripcion,
        imponible,
        activo
      FROM sueldo_bonos_globales
      WHERE activo = true
      ORDER BY nombre
    `;

    logger.debug('📊 Ejecutando consulta de bonos...');
    
    const result = await query(bonosQuery);

    logger.debug('📊 Bonos encontrados:', result.rows?.length || 0);

    const response = {
      success: true,
      data: result.rows || []
    };

    logger.debug('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error al obtener bonos::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
