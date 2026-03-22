// API Configuration — auto-detect dev host from Expo packager
import Constants from 'expo-constants';

function getDevHost() {
  // Expo provides the packager host as "IP:PORT"
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  const host = hostUri.split(':')[0];
  return host || '192.168.0.79'; // fallback
}

const DEV_HOST = getDevHost();
export const API_URL = __DEV__
  ? `http://${DEV_HOST}:3333/api`
  : 'https://dnvt-backend.vercel.app/api';

// Fetch wrapper with auth and timeout
export const fetchWithAuth = async (endpoint, options = {}, token) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || error.error || 'Erro na requisição');
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado. Verifique sua internet.');
    }
    throw err;
  }
};

// API endpoints
export const api = {
  // Auth
  login: (email, senha) => fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha })
  }),

  register: (data) => fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getMe: (token) => fetchWithAuth('/auth/me', {}, token),

  updateProfile: (data, token) => fetchWithAuth('/utilizadores/me', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),

  // Acidentes
  getAcidentes: (token) => fetchWithAuth('/acidentes', {}, token),
  getAcidentesAtivos: (token) => fetchWithAuth('/acidentes/ativos', {}, token),
  getAcidente: (id, token) => fetchWithAuth(`/acidentes/${id}`, {}, token),
  getUrgencias: (token) => fetchWithAuth('/acidentes/urgencias', {}, token),
  createAcidente: (data, token) => fetchWithAuth('/acidentes', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  updateAcidente: (id, data, token) => fetchWithAuth(`/acidentes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),

  // Boletins
  createBoletim: (data, token) => fetchWithAuth('/boletins', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  getBoletins: (token) => fetchWithAuth('/boletins', {}, token),

  // Assistências
  getAssistencias: (token) => fetchWithAuth('/assistencias', {}, token),
  createAssistencia: (data, token) => fetchWithAuth('/assistencias', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  updateAssistencia: (id, data, token) => fetchWithAuth(`/assistencias/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),

  // Agent Tracking
  confirmarIda: (acidenteId, data, token) => fetchWithAuth(`/acidentes/${acidenteId}/confirmar-ida`, {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  updateAgentLocation: (acidenteId, data, token) => fetchWithAuth(`/acidentes/${acidenteId}/agent-location`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),

  // Delegações (Mission Delegation)
  getMinhaDelegacao: (acidenteId, agenteId, token) => fetchWithAuth(`/delegacoes/minha?acidente_id=${acidenteId}&agente_id=${agenteId}`, {}, token),
  solicitarMissao: (data, token) => fetchWithAuth('/delegacoes/solicitar', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  getDelegacoes: (acidenteId, token) => fetchWithAuth(`/delegacoes?acidente_id=${acidenteId}`, {}, token),

  // Anotações (Accident Annotations)
  getAnotacoes: (acidenteId, token) => fetchWithAuth(`/anotacoes?acidente_id=${acidenteId}`, {}, token),
  createAnotacao: (data, token) => fetchWithAuth('/anotacoes', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  uploadFotoAnotacao: (data, token) => fetchWithAuth('/anotacoes/upload-foto', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),

  // Estatisticas
  getEstatisticas: () => fetchWithAuth('/estatisticas/resumo'),

  // Zonas Criticas
  getZonasCriticas: () => fetchWithAuth('/zonas-criticas'),

  // Verificar rota
  verificarRota: (origem, destino) => fetchWithAuth('/rotas/verificar-acidentes', {
    method: 'POST',
    body: JSON.stringify({
      lat_origem: origem.latitude,
      lng_origem: origem.longitude,
      lat_destino: destino.latitude,
      lng_destino: destino.longitude
    })
  }),

  // Notificações
  getNotificacoes: (token) => fetchWithAuth('/notificacoes', {}, token),
  marcarNotifLida: (id, token) => fetchWithAuth(`/notificacoes/${id}/lida`, { method: 'PATCH' }, token),
  marcarTodasLidas: (token) => fetchWithAuth('/notificacoes/marcar-todas-lidas', { method: 'PATCH' }, token),

  // Push token
  registrarPushToken: (pushToken, token) => fetchWithAuth('/auth/push-token', {
    method: 'POST',
    body: JSON.stringify({ push_token: pushToken })
  }, token),

  // Registration validation
  validarEmail: (email) => fetchWithAuth('/auth/validar-email', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  enviarOtp: (telefone) => fetchWithAuth('/auth/enviar-otp', {
    method: 'POST',
    body: JSON.stringify({ telefone })
  }),
  verificarOtp: (telefone, code) => fetchWithAuth('/auth/verificar-otp', {
    method: 'POST',
    body: JSON.stringify({ telefone, code })
  }),

  // Configurações
  getGoogleMapsKey: (token) => fetchWithAuth('/configuracoes/google-maps-key', {}, token),

  // Generic methods
  get: (endpoint, token) => fetchWithAuth(endpoint, {}, token),
  post: (endpoint, data, token) => fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),
  patch: (endpoint, data, token) => fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),
};
