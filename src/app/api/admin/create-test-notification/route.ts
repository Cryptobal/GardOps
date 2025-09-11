import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth';
import { crearAlarma } from '@/lib/alarmas';
import { logger, devLogger } from '@/lib/utils/logger';

// POST - Crear notificación de prueba para administradores
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Crear alarma de prueba
    const resultado = await crearAlarma({
      tenantId: user.tenant_id,
      usuarioId: user.user_id,
      alarma: {
        tipo: 'nuevo_guardia_manual',
        titulo: 'Nuevo Guardia Registrado',
        mensaje: `Se ha registrado Juan Pérez como nuevo guardia (juan.perez@example.com)`,
        datos: {
          guardia_id: 'test-guardia-id',
          urls: {
            ficha_guardia: '/guardias/test-guardia-id'
          }
        }
      }
    });

    if (resultado.success) {
      devLogger.success('🔔 Notificación de prueba creada correctamente');
      return NextResponse.json({
        success: true,
        message: 'Notificación de prueba creada correctamente',
        notificacion: resultado.notificacion
      });
    } else {
      return NextResponse.json({
        success: false,
        error: resultado.error
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('❌ Error creando notificación de prueba:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}