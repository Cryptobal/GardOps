import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';
import { getCurrentUserServer } from '@/lib/auth';

// PUT - Marcar notificación como leída
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const notificacionId = params.id;

    // Verificar que la notificación pertenece al usuario y tenant
    const verifyQuery = `
      SELECT id FROM notificaciones 
      WHERE id = $1 AND tenant_id = $2 AND usuario_id = $3
    `;
    
    const verifyResult = await client.query(verifyQuery, [
      notificacionId, 
      user.tenant_id, 
      user.user_id
    ]);

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Notificación no encontrada o no autorizado'
      }, { status: 404 });
    }

    // Marcar como leída
    const updateQuery = `
      UPDATE notificaciones 
      SET leida = true, fecha_lectura = NOW()
      WHERE id = $1
      RETURNING id, fecha_lectura
    `;

    const result = await client.query(updateQuery, [notificacionId]);
    
    devLogger.success(`✅ Notificación marcada como leída: ${notificacionId}`);

    return NextResponse.json({
      success: true,
      notificacion: {
        id: result.rows[0].id,
        fecha_lectura: result.rows[0].fecha_lectura
      }
    });

  } catch (error: any) {
    logger.error('❌ Error marcando notificación como leída:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}

// DELETE - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const notificacionId = params.id;

    // Verificar que la notificación pertenece al usuario y tenant
    const verifyQuery = `
      SELECT id FROM notificaciones 
      WHERE id = $1 AND tenant_id = $2 AND usuario_id = $3
    `;
    
    const verifyResult = await client.query(verifyQuery, [
      notificacionId, 
      user.tenant_id, 
      user.user_id
    ]);

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Notificación no encontrada o no autorizado'
      }, { status: 404 });
    }

    // Eliminar notificación
    const deleteQuery = `DELETE FROM notificaciones WHERE id = $1`;
    await client.query(deleteQuery, [notificacionId]);
    
    devLogger.success(`🗑️ Notificación eliminada: ${notificacionId}`);

    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ Error eliminando notificación:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
