// API Configuration
export const API_URL = 'https://safe-roads-ao.preview.emergentagent.com/api';

// Fetch wrapper with auth
export const fetchWithAuth = async (endpoint, options = {}, token) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro na requisição');
  }

  return response.json();
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

  updateProfile: (data, token) => fetchWithAuth('/usuarios/me', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }, token),

  // Acidentes
  getAcidentes: (token) => fetchWithAuth('/acidentes', {}, token),
  getAcidentesAtivos: (token) => fetchWithAuth('/acidentes/ativos', {}, token),
  getAcidente: (id, token) => fetchWithAuth(`/acidentes/${id}`, {}, token),
  createAcidente: (data, token) => fetchWithAuth('/acidentes', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token),

  // Estatisticas
  getEstatisticas: () => fetchWithAuth('/estatisticas/resumo'),

  // Zonas Criticas
  getZonasCriticas: () => fetchWithAuth('/zonas-criticas'),

  // Verificar rota
  verificarRota: (origem, destino) => fetchWithAuth(
    `/rotas/verificar-acidentes?lat_origem=${origem.latitude}&lng_origem=${origem.longitude}&lat_destino=${destino.latitude}&lng_destino=${destino.longitude}`
  ),
};
