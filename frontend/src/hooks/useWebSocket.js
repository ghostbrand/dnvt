import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Audio para alertas
const playAlertSound = (type = 'warning') => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'critical') {
      // Som crítico - grave/fatal
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.3;
      oscillator.type = 'square';
      
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 660;
      }, 150);
      setTimeout(() => {
        oscillator.frequency.value = 880;
      }, 300);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);
    } else {
      // Som de aviso normal
      oscillator.frequency.value = 523;
      gainNode.gain.value = 0.2;
      oscillator.type = 'sine';
      
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 659;
      }, 100);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);
    }
  } catch (error) {
    console.log('Audio not supported');
  }
};

export function useNotifications() {
  const [lastAccidents, setLastAccidents] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const lastCheckRef = useRef(new Date().toISOString());
  const intervalRef = useRef(null);

  const checkForNewAccidents = useCallback(async () => {
    try {
      const token = localStorage.getItem('dnvt_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/acidentes/ativos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return;

      const accidents = await response.json();
      
      // Verificar novos acidentes (criados após o último check)
      const newAccidents = accidents.filter(a => {
        const createdAt = new Date(a.created_at);
        const lastCheck = new Date(lastCheckRef.current);
        return createdAt > lastCheck;
      });

      if (newAccidents.length > 0) {
        newAccidents.forEach(acidente => {
          const gravidade = acidente.gravidade;
          const tipo = acidente.tipo_acidente?.replace(/_/g, ' ');
          
          if (gravidade === 'FATAL' || gravidade === 'GRAVE') {
            playAlertSound('critical');
            toast.error(`🚨 ACIDENTE ${gravidade}: ${tipo}`, {
              description: acidente.descricao?.substring(0, 100),
              duration: 15000
            });
          } else {
            playAlertSound('warning');
            toast.warning(`⚠️ Novo Acidente: ${tipo}`, {
              description: acidente.descricao?.substring(0, 100),
              duration: 8000
            });
          }
        });
        
        setLastAccidents(newAccidents);
      }

      lastCheckRef.current = new Date().toISOString();
    } catch (error) {
      console.error('Error checking for accidents:', error);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    setIsPolling(true);
    // Check a cada 15 segundos
    intervalRef.current = setInterval(checkForNewAccidents, 15000);
    // Verificar imediatamente
    checkForNewAccidents();
  }, [checkForNewAccidents]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return { 
    isPolling, 
    lastAccidents, 
    checkNow: checkForNewAccidents,
    playAlertSound 
  };
}

export { playAlertSound };
