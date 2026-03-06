import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('dnvt_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Acidentes
export const acidentesApi = {
  listAtivos: async () => {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/acidentes/ativos`, { headers });
    if (!res.ok) throw new Error('Erro ao listar acidentes');
    return res.json();
  },
  
  create: async (data) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/acidentes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, origem_registro: 'MOBILE_CIDADAO' })
    });
    if (!res.ok) throw new Error('Erro ao criar acidente');
    return res.json();
  }
};

// Zonas Críticas
export const zonasApi = {
  list: async () => {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/zonas-criticas`, { headers });
    if (!res.ok) throw new Error('Erro ao listar zonas');
    return res.json();
  }
};

// Assistências
export const assistenciasApi = {
  list: async (acidenteId) => {
    const headers = await getHeaders();
    const url = acidenteId 
      ? `${API_URL}/assistencias?acidente_id=${acidenteId}`
      : `${API_URL}/assistencias`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Erro ao listar assistências');
    return res.json();
  }
};

// Rotas
export const rotasApi = {
  verificarAcidentes: async (latOrigem, lngOrigem, latDestino, lngDestino) => {
    const headers = await getHeaders();
    const params = new URLSearchParams({
      lat_origem: latOrigem,
      lng_origem: lngOrigem,
      lat_destino: latDestino,
      lng_destino: lngDestino
    });
    const res = await fetch(`${API_URL}/rotas/verificar-acidentes?${params}`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Erro ao verificar rota');
    return res.json();
  }
};
