import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener instalaciones con roles de servicio
export async function GET(request: NextRequest) {
  logger.debug('🔍 GET /api/payroll/instalaciones-con-roles - Iniciando...');
  
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
    // Obtener instalaciones que tienen roles de servicio asignados
    const instalacionesQuery = `
      SELECT DISTINCT
        i.id,
        i.nombre,
        i.direccion,
        i.estado
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON rs.id = po.rol_id
      WHERE i.estado = 'Activo' AND po.activo = true
      ORDER BY i.nombre
    `;

    logger.debug('📊 Ejecutando consulta de instalaciones...');
    
    const result = await query(instalacionesQuery);

    logger.debug('📊 Instalaciones encontradas:', result.rows?.length || 0);

    const response = {
      success: true,
      data: result.rows || []
    };

    logger.debug('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error al obtener instalaciones::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
