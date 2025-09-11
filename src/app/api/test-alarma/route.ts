import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth';
import { crearAlarma } from '@/lib/alarmas';
import { logger, devLogger } from '@/lib/utils/logger';

// POST - Crear alarma de prueba
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tipo = 'test' } = body;

    // Crear alarma de prueba
    const resultado = await crearAlarma({
      tenantId: user.tenant_id,
      usuarioId: user.user_id,
      alarma: {
        tipo: tipo,
        titulo: 'Alarma de Prueba',
        mensaje: `Esta es una alarma de prueba del sistema. Tipo: ${tipo}. Creada el ${new Date().toLocaleString('es-CL')}`,
        datos: {
          tipo_prueba: tipo,
          creada_en: new Date().toISOString(),
          usuario: user.email
        }
      }
    });

    if (resultado.success) {
      devLogger.success('🔔 Alarma de prueba creada correctamente');
      return NextResponse.json({
        success: true,
        message: 'Alarma de prueba creada correctamente',
        alarma: resultado.notificacion
      });
    } else {
      return NextResponse.json({
        success: false,
        error: resultado.error
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('❌ Error creando alarma de prueba:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
