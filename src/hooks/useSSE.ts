import { useEffect, useRef, useState } from 'react';

interface SSEEvent {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
}

export function useSSE(url: string, onMessage?: (event: SSEEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    console.log('🔌 SSE: Iniciando conexión a:', url);
    
    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      console.log('🔌 SSE: Cerrando conexión anterior');
      eventSourceRef.current.close();
    }
    
    // Crear nueva conexión SSE
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('🔌 SSE: Conexión establecida exitosamente');
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('📡 SSE: Mensaje recibido (raw):', event);
        console.log('📡 SSE: Mensaje data:', event.data);
        const data: SSEEvent = JSON.parse(event.data);
        console.log('📡 SSE: Mensaje parseado:', data);

        if (onMessage) {
          console.log('📡 SSE: Llamando onMessage con datos:', data);
          onMessage(data);
        } else {
          console.log('⚠️ SSE: onMessage no está definido');
        }
      } catch (error) {
        console.error('❌ SSE: Error parsing message:', error);
      }
    };

    // Escuchar eventos específicos
    eventSource.addEventListener('turno_update', (event) => {
      try {
        console.log('📡 SSE: Evento turno_update recibido (raw):', event);
        console.log('📡 SSE: Evento turno_update data:', event.data);
        const data: SSEEvent = JSON.parse(event.data);
        console.log('📡 SSE: Evento turno_update parseado:', data);
        
        if (onMessage) {
          console.log('📡 SSE: Llamando onMessage con datos:', data);
          onMessage(data);
        } else {
          console.log('⚠️ SSE: onMessage no está definido');
        }
      } catch (error) {
        console.error('❌ SSE: Error parsing turno_update event:', error);
      }
    });

    // También escuchar eventos de conexión
    eventSource.addEventListener('connection', (event) => {
      try {
        console.log('📡 SSE: Evento connection recibido (raw):', event);
        console.log('📡 SSE: Evento connection data:', event.data);
        const data: SSEEvent = JSON.parse(event.data);
        console.log('📡 SSE: Evento connection parseado:', data);
        
        if (onMessage) {
          console.log('📡 SSE: Llamando onMessage con datos connection:', data);
          onMessage(data);
        } else {
          console.log('⚠️ SSE: onMessage no está definido para connection');
        }
      } catch (error) {
        console.error('❌ SSE: Error parsing connection event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('❌ SSE: Error de conexión:', error);
      console.error('❌ SSE: Estado de conexión:', eventSource.readyState);
      setError('Error de conexión SSE');
      setIsConnected(false);
      
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        const newEventSource = new EventSource(url);
        eventSourceRef.current = newEventSource;
        
        newEventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          console.log('🔌 SSE: Reconexión establecida');
        };
        
        newEventSource.onmessage = (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);
            console.log('📡 SSE: Mensaje recibido (reconexión):', data);
            
            if (onMessage) {
              onMessage(data);
            }
          } catch (error) {
            console.error('❌ SSE: Error parsing message (reconexión):', error);
          }
        };
        
        newEventSource.addEventListener('turno_update', (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);
            console.log('📡 SSE: Evento turno_update recibido (reconexión):', data);
            
            if (onMessage) {
              onMessage(data);
            }
          } catch (error) {
            console.error('❌ SSE: Error parsing turno_update event (reconexión):', error);
          }
        });
        
        newEventSource.onerror = (error) => {
          console.error('❌ SSE: Error de reconexión:', error);
          setError('Error de conexión SSE');
          setIsConnected(false);
        };
      }, 5000);
    };

    // Cleanup al desmontar
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [url]); // Remover onMessage de las dependencias para evitar recreaciones

  const close = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  return {
    isConnected,
    error,
    close
  };
}
