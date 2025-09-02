import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    const client = await getClient();
    
    try {
      // Obtener logs de webhook del tenant con información del guardia
      const logsQuery = `
        SELECT 
          wl.id,
          wl.guardia_id,
          CONCAT(g.nombre, ' ', g.apellido_paterno) as guardia_nombre,
          wl.url_webhook,
          wl.response_status,
          wl.error_message,
          wl.created_at
        FROM webhook_logs wl
        INNER JOIN guardias g ON g.id = wl.guardia_id
        WHERE wl.tenant_id = $1
        ORDER BY wl.created_at DESC
        LIMIT 50
      `;

      const result = await client.query(logsQuery, [tenantId]);

      const logs = result.rows.map(log => ({
        id: log.id,
        guardia_id: log.guardia_id,
        guardia_nombre: log.guardia_nombre,
        url_webhook: log.url_webhook,
        response_status: log.response_status,
        error_message: log.error_message,
        created_at: log.created_at
      }));

      return NextResponse.json({ logs });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error obteniendo logs de webhook:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
