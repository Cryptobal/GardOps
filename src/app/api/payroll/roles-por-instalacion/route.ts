import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener roles de servicio por instalación
export async function GET(request: NextRequest) {
  logger.debug('🔍 GET /api/payroll/roles-por-instalacion - Iniciando...');
  
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
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');

    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere instalacion_id' },
        { status: 400 }
      );
    }

    logger.debug('📊 Buscando roles para instalación:', instalacionId);

    // Obtener roles de servicio por instalación
    const rolesQuery = `
      SELECT DISTINCT
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_termino,
        rs.estado
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true 
        AND rs.estado = 'Activo'
      ORDER BY rs.nombre
    `;

    logger.debug('📊 Ejecutando consulta de roles...');
    
    const result = await query(rolesQuery, [instalacionId]);

    logger.debug('📊 Roles encontrados:', result.rows?.length || 0);

    // Procesar roles para incluir información completa
    const roles = (result.rows || []).map(rol => ({
      ...rol,
      nombre_completo: `${rol.nombre} - ${rol.dias_trabajo}x${rol.dias_descanso}${
        rol.hora_inicio && rol.hora_termino ? ` / ${rol.hora_inicio}-${rol.hora_termino}` : ''
      }`
    }));

    const response = {
      success: true,
      data: roles
    };

    logger.debug('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error al obtener roles por instalación::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
