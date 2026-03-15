const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getHeaders = () => {
  const token = localStorage.getItem('dnvt_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Acidentes
export const acidentesApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/acidentes?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar acidentes');
    return res.json();
  },
  
  listAtivos: async () => {
    const res = await fetch(`${API}/acidentes/ativos`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar acidentes ativos');
    return res.json();
  },
  
  get: async (id) => {
    const res = await fetch(`${API}/acidentes/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Acidente não encontrado');
    return res.json();
  },
  
  create: async (data) => {
    const res = await fetch(`${API}/acidentes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao criar acidente');
    return res.json();
  },
  
  update: async (id, data) => {
    const res = await fetch(`${API}/acidentes/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao atualizar acidente');
    return res.json();
  },
  
  delete: async (id) => {
    const res = await fetch(`${API}/acidentes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao remover acidente');
    return res.json();
  },

  getAgentesACaminho: async (id) => {
    const res = await fetch(`${API}/acidentes/${id}/agentes-a-caminho`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }
};

// Boletins
export const boletinsApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/boletins?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar boletins');
    return res.json();
  },
  
  get: async (id) => {
    const res = await fetch(`${API}/boletins/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Boletim não encontrado');
    return res.json();
  },
  
  create: async (data) => {
    const res = await fetch(`${API}/boletins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao criar boletim');
    return res.json();
  },
  
  upload: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('dnvt_token');
    const res = await fetch(`${API}/boletins/${id}/upload`, {
      method: 'POST',
      headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      body: formData
    });
    if (!res.ok) throw new Error('Erro ao enviar arquivo');
    return res.json();
  }
};

// Assistências
export const assistenciasApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/assistencias?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar assistências');
    return res.json();
  },
  
  create: async (data) => {
    const res = await fetch(`${API}/assistencias`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao criar assistência');
    return res.json();
  },
  
  update: async (id, data) => {
    const res = await fetch(`${API}/assistencias/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao atualizar assistência');
    return res.json();
  }
};

// Zonas Críticas
export const zonasApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/zonas-criticas?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar zonas críticas');
    return res.json();
  },
  
  create: async (data) => {
    const res = await fetch(`${API}/zonas-criticas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Erro ao criar zona');
    }
    return res.json();
  },
  
  validar: async (id) => {
    const res = await fetch(`${API}/zonas-criticas/${id}/validar`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao validar zona');
    return res.json();
  },
  
  calcular: async () => {
    const res = await fetch(`${API}/zonas-criticas/calcular`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao calcular zonas');
    return res.json();
  },
  
  update: async (id, data) => {
    const res = await fetch(`${API}/zonas-criticas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Erro ao atualizar zona');
    }
    return res.json();
  },

  delete: async (id) => {
    const res = await fetch(`${API}/zonas-criticas/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Erro ao eliminar zona');
    }
    return res.json();
  },

  updateMonitores: async (id, monitores) => {
    const res = await fetch(`${API}/zonas-criticas/${id}/monitores`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ monitores })
    });
    if (!res.ok) throw new Error('Erro ao atualizar monitores');
    return res.json();
  }
};

// Estatísticas
export const estatisticasApi = {
  resumo: async () => {
    const res = await fetch(`${API}/estatisticas/resumo`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter estatísticas');
    return res.json();
  },
  
  mensal: async (ano, mes) => {
    const params = new URLSearchParams();
    if (ano) params.append('ano', ano);
    if (mes) params.append('mes', mes);
    const res = await fetch(`${API}/estatisticas/mensal?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter estatísticas mensais');
    return res.json();
  },
  
  porHora: async () => {
    const res = await fetch(`${API}/estatisticas/por-hora`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter estatísticas por hora');
    return res.json();
  },
  
  porDiaSemana: async () => {
    const res = await fetch(`${API}/estatisticas/por-dia-semana`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter estatísticas por dia');
    return res.json();
  }
};

// Configurações
export const configuracoesApi = {
  get: async () => {
    const res = await fetch(`${API}/configuracoes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter configurações');
    return res.json();
  },
  
  update: async (data) => {
    const res = await fetch(`${API}/configuracoes`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    return res.json();
  },
  
  getGoogleMapsKey: async () => {
    const res = await fetch(`${API}/configuracoes/google-maps-key`);
    if (!res.ok) return { api_key: null };
    return res.json();
  }
};

// SMS
export const smsApi = {
  enviar: async (phoneNumber, message) => {
    const res = await fetch(`${API}/sms/enviar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone_number: phoneNumber, message })
    });
    if (!res.ok) throw new Error('Erro ao enviar SMS');
    return res.json();
  },
  
  saldo: async () => {
    const res = await fetch(`${API}/sms/saldo`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao obter saldo');
    return res.json();
  }
};

// Utilizadores
export const utilizadoresApi = {
  list: async () => {
    const res = await fetch(`${API}/utilizadores`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar utilizadores');
    return res.json();
  },
  
  create: async (data) => {
    const res = await fetch(`${API}/utilizadores`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar utilizador');
    }
    return res.json();
  },
  
  update: async (id, data) => {
    const res = await fetch(`${API}/utilizadores/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao atualizar utilizador');
    return res.json();
  },
  
  aprovar: async (id) => {
    const res = await fetch(`${API}/utilizadores/${id}/aprovar`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao aprovar utilizador');
    return res.json();
  },
  
  resetSenha: async (id) => {
    const res = await fetch(`${API}/utilizadores/${id}/reset-senha`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao redefinir senha');
    return res.json();
  },
  
  suspender: async (id) => {
    const res = await fetch(`${API}/utilizadores/${id}/suspender`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao suspender utilizador');
    return res.json();
  }
};

// Notificações
export const notificacoesApi = {
  list: async () => {
    const res = await fetch(`${API}/notificacoes`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  historico: async () => {
    const res = await fetch(`${API}/notificacoes/historico`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  marcarLida: async (id) => {
    const res = await fetch(`${API}/notificacoes/${id}/lida`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao marcar notificação');
    return res.json();
  },

  marcarTodasLidas: async () => {
    const res = await fetch(`${API}/notificacoes/marcar-todas-lidas`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro');
    return res.json();
  },

  enviar: async (data) => {
    const res = await fetch(`${API}/notificacoes/enviar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao enviar notificação');
    return res.json();
  }
};

// Delegações (Mission Delegation)
export const delegacoesApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/delegacoes?${query}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  pedidosPendentes: async () => {
    const res = await fetch(`${API}/delegacoes/pedidos-pendentes`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  create: async (data) => {
    const res = await fetch(`${API}/delegacoes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao delegar missão');
    }
    return res.json();
  },

  aprovar: async (id, data = {}) => {
    const res = await fetch(`${API}/delegacoes/${id}/aprovar`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao aprovar delegação');
    return res.json();
  },

  rejeitar: async (id, data = {}) => {
    const res = await fetch(`${API}/delegacoes/${id}/rejeitar`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao rejeitar delegação');
    return res.json();
  },

  agentesAtivos: async () => {
    const res = await fetch(`${API}/agentes/ativos-localizacao`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }
};

// Anotações
export const anotacoesApi = {
  list: async (acidenteId) => {
    const res = await fetch(`${API}/anotacoes?acidente_id=${acidenteId}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }
};

// Histórico / Audit Log
export const historicoApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/historico?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao listar histórico');
    return res.json();
  }
};

// Rotas
export const rotasApi = {
  verificarAcidentes: async (latOrigem, lngOrigem, latDestino, lngDestino) => {
    const params = new URLSearchParams({
      lat_origem: latOrigem,
      lng_origem: lngOrigem,
      lat_destino: latDestino,
      lng_destino: lngDestino
    });
    const res = await fetch(`${API}/rotas/verificar-acidentes?${params}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao verificar rota');
    return res.json();
  }
};
