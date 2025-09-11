import { NextRequest } from 'next/server';

// Configurar como ruta dinámica para evitar prerendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store para mantener las conexiones SSE activas
const connections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  console.log('🔌 SSE: Nueva conexión recibida');
  
  // Crear un stream para Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Agregar esta conexión al set de conexiones activas
      connections.add(controller);
      console.log(`🔌 SSE: Conexión agregada. Total conexiones: ${connections.size}`);
      
      // Enviar mensaje de conexión establecida
      const data = JSON.stringify({
        type: 'connection',
        message: 'Conexión establecida',
        timestamp: new Date().toISOString()
      });
      
      // Codificar correctamente el mensaje SSE
      const sseMessage = `data: ${data}\n\n`;
      controller.enqueue(new TextEncoder().encode(sseMessage));
      
      // Función para limpiar la conexión cuando se cierre
      const cleanup = () => {
        connections.delete(controller);
        console.log(`🔌 SSE: Conexión removida. Total conexiones: ${connections.size}`);
      };
      
      // Escuchar cuando se cierre la conexión
      request.signal.addEventListener('abort', cleanup);
    },
    
    cancel(controller) {
      // Limpiar la conexión cuando se cancele
      connections.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Función para notificar a todas las conexiones activas
export function notifyTurnoUpdate(data: any) {
  const message = JSON.stringify({
    type: 'turno_update',
    data,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📡 SSE: Enviando notificación a ${connections.size} conexiones:`, message);
  
  // Enviar a todas las conexiones activas
  connections.forEach(controller => {
    try {
      const sseMessage = `event: turno_update\ndata: ${message}\n\n`;
      controller.enqueue(new TextEncoder().encode(sseMessage));
    } catch (error) {
      console.error('❌ SSE: Error enviando mensaje:', error);
      // Si hay error, remover la conexión
      connections.delete(controller);
    }
  });
}

// Función para obtener el número de conexiones activas
export function getActiveConnections() {
  return connections.size;
}
