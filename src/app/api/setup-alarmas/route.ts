import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';
import { getCurrentUserServer } from '@/lib/auth';

// POST - Configurar sistema de alarmas completo
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.debug('🔔 Configurando sistema de alarmas completo...');

    // 1. Crear tabla de notificaciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        usuario_id UUID NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        datos JSONB,
        leida BOOLEAN DEFAULT false,
        fecha_lectura TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Crear índices para rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_tenant_usuario 
      ON notificaciones(tenant_id, usuario_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_leida 
      ON notificaciones(leida)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo 
      ON notificaciones(tipo)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at 
      ON notificaciones(created_at DESC)
    `);

    // 3. Crear una notificación de prueba
    const { crearAlarma } = await import('@/lib/alarmas');
    await crearAlarma({
      tenantId: user.tenant_id,
      usuarioId: user.user_id,
      alarma: {
        tipo: 'sistema_configurado',
        titulo: 'Sistema de Alarmas Configurado',
        mensaje: 'El sistema de alarmas ha sido configurado correctamente. Ahora recibirás notificaciones cuando se creen nuevos guardias.',
        datos: {
          configurado_en: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    });

    logger.debug('✅ Sistema de alarmas configurado correctamente');

    return NextResponse.json({
      success: true,
      message: 'Sistema de alarmas configurado correctamente',
      configurado_en: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ Error configurando sistema de alarmas:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
