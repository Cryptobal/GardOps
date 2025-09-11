import { NextRequest, NextResponse } from 'next/server';
import { notifyTurnoUpdate } from '@/app/api/events/turnos/route';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test: Simulando actualización de turno...');
    
    // Simular una actualización de turno
    const testData = {
      pauta_id: 'test-123',
      estado_semaforo: 'en_camino',
      ultima_actualizacion: new Date().toISOString(),
      fecha: new Date().toISOString().split('T')[0]
    };

    // Notificar a todas las conexiones SSE
    notifyTurnoUpdate(testData);

    return NextResponse.json({
      success: true,
      message: 'Notificación SSE enviada',
      data: testData
    });

  } catch (error) {
    console.error('❌ Error en test de turno update:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
