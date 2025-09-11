import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';
import { getCurrentUserServer } from '@/lib/auth';

// PUT - Marcar todas las notificaciones como leídas
export async function PUT(request: NextRequest) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Marcar todas las notificaciones no leídas como leídas
    const updateQuery = `
      UPDATE notificaciones 
      SET leida = true, fecha_lectura = NOW()
      WHERE tenant_id = $1 AND usuario_id = $2 AND leida = false
      RETURNING COUNT(*) as actualizadas
    `;

    const result = await client.query(updateQuery, [
      user.tenant_id, 
      user.user_id
    ]);
    
    const actualizadas = parseInt(result.rows[0].actualizadas);
    
    devLogger.success(`✅ ${actualizadas} notificaciones marcadas como leídas`);

    return NextResponse.json({
      success: true,
      actualizadas,
      message: `${actualizadas} notificaciones marcadas como leídas`
    });

  } catch (error: any) {
    logger.error('❌ Error marcando notificaciones como leídas:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
