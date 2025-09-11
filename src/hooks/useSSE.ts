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
    // Crear nueva conexión SSE
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('🔌 SSE: Conexión establecida');
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        console.log('📡 SSE: Mensaje recibido:', data);
        
        if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        console.error('❌ SSE: Error parsing message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE: Error de conexión:', error);
      setError('Error de conexión SSE');
      setIsConnected(false);
    };

    // Cleanup al desmontar
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [url, onMessage]);

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
