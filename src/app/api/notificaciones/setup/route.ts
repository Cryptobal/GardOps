import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';

// POST - Configurar tabla de notificaciones
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    logger.debug('🔔 Configurando tabla de notificaciones...');

    // Crear tabla de notificaciones
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

    // Crear índices para rendimiento
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

    logger.debug('✅ Tabla de notificaciones configurada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Tabla de notificaciones configurada correctamente'
    });

  } catch (error: any) {
    logger.error('❌ Error configurando tabla de notificaciones:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}

