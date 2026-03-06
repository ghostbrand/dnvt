import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket(`${WS_URL}/ws/notifications`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Show toast notification based on message type
          if (data.type === 'NEW_ACCIDENT') {
            const gravidade = data.data.gravidade;
            const tipo = data.data.tipo_acidente?.replace(/_/g, ' ');
            
            if (gravidade === 'FATAL' || gravidade === 'GRAVE') {
              toast.error(`🚨 ACIDENTE ${gravidade}: ${tipo}`, {
                description: data.data.descricao,
                duration: 10000
              });
            } else {
              toast.warning(`⚠️ Novo Acidente: ${tipo}`, {
                description: data.data.descricao,
                duration: 5000
              });
            }
          } else if (data.type === 'ASSISTANCE_UPDATE') {
            const status = data.data.status;
            const tipo = data.data.tipo;
            
            if (status === 'NO_LOCAL') {
              toast.info(`🚑 ${tipo} chegou ao local`, { duration: 4000 });
            } else if (status === 'FINALIZADO') {
              toast.success(`✅ ${tipo} finalizou atendimento`, { duration: 4000 });
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, lastMessage, reconnect: connect };
}
