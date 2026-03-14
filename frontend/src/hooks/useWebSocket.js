import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Audio para alertas — sirene urgente prolongada
const playAlertSound = (type = 'warning') => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    if (type === 'critical') {
      // Sirene de urgência prolongada (~4 segundos) — oscila entre 2 frequências
      const duration = 4;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.35, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      // Oscilação sirene: alterna entre 880Hz e 580Hz repetidamente
      const cycles = 8;
      for (let i = 0; i < cycles; i++) {
        const t = now + (i * duration / cycles);
        oscillator.frequency.setValueAtTime(880, t);
        oscillator.frequency.linearRampToValueAtTime(580, t + duration / cycles / 2);
        oscillator.frequency.linearRampToValueAtTime(880, t + duration / cycles);
      }

      oscillator.start(now);
      oscillator.stop(now + duration);
      setTimeout(() => audioContext.close(), (duration + 0.5) * 1000);
    } else {
      // Alerta normal (~1.5 segundos) — 3 beeps urgentes
      const beepDuration = 0.15;
      const gap = 0.2;
      const totalBeeps = 3;
      
      for (let i = 0; i < totalBeeps; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.value = 698;
        gain.gain.setValueAtTime(0.25, now + i * (beepDuration + gap));
        gain.gain.linearRampToValueAtTime(0, now + i * (beepDuration + gap) + beepDuration);
        osc.start(now + i * (beepDuration + gap));
        osc.stop(now + i * (beepDuration + gap) + beepDuration);
      }

      const total = totalBeeps * (beepDuration + gap);
      setTimeout(() => audioContext.close(), (total + 0.5) * 1000);
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
