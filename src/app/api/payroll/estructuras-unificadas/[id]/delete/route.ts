import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuthz } from '@/lib/authz-api';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('🔍 DELETE /api/payroll/estructuras-unificadas/[id]/delete - Iniciando...');
    
    const { id } = params;
    logger.debug('📝 ID a eliminar:', id);
    
    // Verificar permisos de administrador
    const authResult = await requireAuthz(request, ['admin']);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    logger.debug('✅ Permisos verificados correctamente');

    // Determinar tipo de estructura y eliminar
    const estructuraQuery = await db.query(`
      SELECT 'servicio' as tipo FROM sueldo_estructuras_servicio WHERE id = $1
      UNION ALL
      SELECT 'guardia' as tipo FROM sueldo_estructura_guardia WHERE id = $1
    `, [id]);

    if (estructuraQuery.rows.length === 0) {
      logger.debug('❌ Estructura no encontrada');
      return NextResponse.json({ success: false, error: 'Estructura no encontrada' }, { status: 404 });
    }

    const tipo = estructuraQuery.rows[0].tipo;
    logger.debug('📊 Tipo de estructura:', tipo);

    if (tipo === 'servicio') {
      // Eliminar estructura de servicio
      await db.query('DELETE FROM sueldo_estructuras_servicio WHERE id = $1', [id]);
      logger.debug('✅ Estructura de servicio eliminada');
    } else if (tipo === 'guardia') {
      // Eliminar estructura de guardia (cascada)
      await db.query('DELETE FROM sueldo_estructura_guardia_item WHERE estructura_guardia_id = $1', [id]);
      await db.query('DELETE FROM sueldo_estructura_guardia WHERE id = $1', [id]);
      logger.debug('✅ Estructura de guardia eliminada');
    }

    logger.debug('✅ Estructura eliminada correctamente');
    return NextResponse.json({ 
      success: true, 
      message: 'Estructura eliminada correctamente',
      tipo: tipo
    });

  } catch (error) {
    console.error('❌ Error eliminando estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
