import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logError, logCRUD } from '@/lib/logging';
import { getFormularioUrl } from '@/lib/config';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Forzar que esta ruta sea dinámica para evitar renderizado estático
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  logger.debug('🔍 Configuración Postulaciones: Iniciando GET');
  
  try {
    // Por ahora usar el tenant Gard para testing
    // En producción, obtener del token de autenticación
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    
    const client = await getClient();
    
    try {
      // Obtener información del tenant
      const tenantResult = await client.query(
        'SELECT id, nombre FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Tenant no encontrado' },
          { status: 404 }
        );
      }

      const tenant = tenantResult.rows[0];

      // Obtener configuración del webhook
      const webhookResult = await client.query(
        'SELECT url_webhook, activo FROM tenant_webhooks WHERE tenant_id = $1',
        [tenantId]
      );

      const webhookConfig = webhookResult.rows[0] || {
        url_webhook: null,
        activo: false
      };

      // Construir URL del formulario usando la configuración centralizada
      const formularioUrl = getFormularioUrl(tenantId);

      const config = {
        id: tenant.id,
        nombre: tenant.nombre,
        url_webhook: webhookConfig.url_webhook,
        webhook_activo: webhookConfig.activo,
        formulario_url: formularioUrl
      };

      return NextResponse.json({ config });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error obteniendo configuración de postulaciones:', error);
    
    await logError({
      error: error.message,
      stack: error.stack,
      contexto: 'API configuración postulaciones GET'
    });

    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { url_webhook, webhook_activo } = body;

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    
    const client = await getClient();
    
    try {
      // Validar URL del webhook si se proporciona
      if (url_webhook && url_webhook.trim()) {
        try {
          new URL(url_webhook);
        } catch {
          return NextResponse.json({
            error: 'URL del webhook inválida'
          }, { status: 400 });
        }
      }

      // Insertar o actualizar configuración del webhook
      const upsertQuery = `
        INSERT INTO tenant_webhooks (tenant_id, url_webhook, activo, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tenant_id) 
        DO UPDATE SET
          url_webhook = EXCLUDED.url_webhook,
          activo = EXCLUDED.activo,
          updated_at = NOW()
        RETURNING id, url_webhook, activo
      `;

      const result = await client.query(upsertQuery, [
        tenantId,
        url_webhook?.trim() || null,
        webhook_activo || false
      ]);

      const webhookConfig = result.rows[0];

      devLogger.success(' Configuración de webhook actualizada:', webhookConfig);

      // Log de la operación
      await logCRUD(
        'tenant_webhooks',
        webhookConfig.id,
        'UPDATE',
        'admin', // En producción obtener del token
        null, // datos_anteriores
        { url_webhook: webhookConfig.url_webhook, activo: webhookConfig.activo }, // datos_nuevos
        tenantId
      );

      return NextResponse.json({
        success: true,
        config: {
          url_webhook: webhookConfig.url_webhook,
          webhook_activo: webhookConfig.activo
        },
        mensaje: 'Configuración actualizada exitosamente'
      });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error actualizando configuración de postulaciones:', error);
    
    await logError({
      error: error.message,
      stack: error.stack,
      contexto: 'API configuración postulaciones PUT',
      datos_entrada: body
    });

    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
