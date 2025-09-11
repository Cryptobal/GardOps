import { NextRequest } from 'next/server';

// Store para mantener las conexiones SSE activas
const connections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  // Crear un stream para Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Agregar esta conexión al set de conexiones activas
      connections.add(controller);
      
      // Enviar mensaje de conexión establecida
      const data = JSON.stringify({
        type: 'connection',
        message: 'Conexión establecida',
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      
      // Función para limpiar la conexión cuando se cierre
      const cleanup = () => {
        connections.delete(controller);
      };
      
      // Escuchar cuando se cierre la conexión
      request.signal.addEventListener('abort', cleanup);
    },
    
    cancel() {
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
  
  // Enviar a todas las conexiones activas
  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${message}\n\n`);
    } catch (error) {
      // Si hay error, remover la conexión
      connections.delete(controller);
    }
  });
}

// Función para obtener el número de conexiones activas
export function getActiveConnections() {
  return connections.size;
}
