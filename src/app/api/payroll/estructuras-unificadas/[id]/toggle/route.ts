import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// PATCH - Toggle estado de estructura (activar/inactivar)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.debug('🔍 PATCH /api/payroll/estructuras-unificadas/[id]/toggle - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      logger.debug('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    logger.debug('✅ Permisos verificados correctamente');
  } catch (error) {
    logger.warn(' Error verificando permisos:', error);
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { activo } = body;

    logger.debug('📝 Datos recibidos:', { id, activo });

    // Validaciones
    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'El campo activo debe ser un booleano' },
        { status: 400 }
      );
    }

    // Primero verificar si existe la estructura y determinar su tipo
    const checkQuery = `
      SELECT 
        CASE 
          WHEN EXISTS(SELECT 1 FROM sueldo_estructuras_servicio WHERE id = $1) THEN 'servicio'
          WHEN EXISTS(SELECT 1 FROM sueldo_estructura_guardia WHERE id = $1) THEN 'guardia'
          ELSE NULL
        END as tipo
    `;

    const checkResult = await query(checkQuery, [id]);

    if (!checkResult.rows || checkResult.rows.length === 0 || !checkResult.rows[0].tipo) {
      return NextResponse.json(
        { success: false, error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    const tipo = checkResult.rows[0].tipo;
    logger.debug('📊 Tipo de estructura:', tipo);

    let result;

    if (tipo === 'servicio') {
      // Actualizar estructura de servicio
      const updateQuery = `
        UPDATE sueldo_estructuras_servicio 
        SET activo = $1, 
            fecha_inactivacion = CASE WHEN $1 = false THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, activo
      `;

      result = await query(updateQuery, [activo, id]);

    } else if (tipo === 'guardia') {
      // Actualizar estructura por guardia
      const updateQuery = `
        UPDATE sueldo_estructura_guardia 
        SET activo = $1, 
            vigencia_hasta = CASE WHEN $1 = false THEN CURRENT_DATE ELSE NULL END
        WHERE id = $2
        RETURNING id, activo
      `;

      result = await query(updateQuery, [activo, id]);
    }

    if (!result || !result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la estructura' },
        { status: 500 }
      );
    }

    logger.debug('✅ Estado actualizado exitosamente');

    const response = {
      success: true,
      data: {
        id: result.rows[0].id,
        activo: result.rows[0].activo,
        tipo,
        mensaje: `Estructura ${activo ? 'activada' : 'inactivada'} exitosamente`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error al cambiar estado de estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
