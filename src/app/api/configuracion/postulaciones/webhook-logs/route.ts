import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Obtener tenant_id del usuario actual (por ahora usar 'Gard')
    let tenantId: string;
    try {
      const client = await getClient();
      const tenantResult = await client.query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        // Crear tenant 'Gard' si no existe
        const newTenant = await client.query(`
          INSERT INTO tenants (nombre, activo) VALUES ('Gard', true) RETURNING id
        `);
        tenantId = newTenant.rows[0].id;
      } else {
        tenantId = tenantResult.rows[0].id;
      }
      client.release?.();
    } catch (error) {
      logger.error('Error obteniendo tenant_id::', error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    
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
