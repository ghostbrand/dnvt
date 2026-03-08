# DNVT - Sistema de Gestão de Acidentes de Trânsito

## Visão Geral
Sistema completo para gestão de acidentes de trânsito em Angola, desenvolvido para a Direção Nacional de Viação e Trânsito.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB Atlas
- **Frontend Web**: React.js (Create React App)
- **Mobile**: React Native (Expo) - estrutura criada
- **UI**: Shadcn/UI + Tailwind CSS
- **Autenticação**: JWT + Google OAuth (Emergent Auth)
- **Mapas**: Google Maps API (configurável)
- **SMS**: Ombala API (configurável)
- **PDF**: ReportLab
- **Database**: MongoDB Atlas (dnvt)

## Implementado

### Backend (/app/backend/)
- API completa com 35+ endpoints
- Autenticação JWT e Google OAuth
- CRUD completo de acidentes, boletins, assistências, zonas críticas
- Geração de PDF para Boletins de Ocorrência
- Integração Ombala SMS
- Cálculo automático de zonas críticas
- **Perfil de Usuário com validação de BI angolano** (06/03/2026)

### Frontend Web (/app/frontend/)
- Dashboard com estatísticas e gráficos
- Mapa interativo com Google Maps
- CRUD de acidentes com geolocalização
- Gestão de boletins com geração de PDF
- Zonas críticas com recomendações
- Gestão de assistências em tempo real
- Configurações de API Keys
- Sistema de Polling para notificações (substitui WebSocket)
- **Página de Perfil completa com edição** (06/03/2026)

### Mobile (/app/mobile/) - ESTRUTURA CRIADA
- Estrutura Expo configurada
- Telas: Login, Home, Map, ReportAccident, Alerts, Profile
- **NOTA**: Requer ambiente Expo separado para build

## Credenciais de Teste
- **Admin**: admin@dnvt.ao / Admin123!

## URLs
- **Frontend**: https://safe-roads-ao.preview.emergentagent.com
- **API**: https://safe-roads-ao.preview.emergentagent.com/api

## Modelo de Usuário (Atualizado)
```json
{
  "user_id": "string",
  "nome": "string",
  "email": "string",
  "telefone": "string",
  "tipo": "ADMIN|POLICIA|CIDADAO",
  "bilhete_identidade": "string (formato: 123456789LA123)",
  "endereco": "string",
  "zonas_notificacao": ["zona_id1", "zona_id2"],
  "alertas_novos_acidentes": true,
  "alertas_sonoros": true,
  "alertas_sms": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Backlog Priorizado

### P0 - Alta Prioridade
- [ ] Desenvolver aplicativo móvel React Native completo

### P1 - Média Prioridade
- [ ] CRUD completo (editar, excluir, detalhes) para todas entidades
- [ ] Sistema de Notificações por Zona Geográfica
- [ ] Reporte de Acidente pelo Mapa (clicar para reportar)

### P2 - Baixa Prioridade
- [ ] Histórico de Auditoria (criado_por, atualizado_em)
- [ ] Exportação para Excel (XLSX)
- [ ] Pesquisar API de validação de BI Angolano (se existir)

### P3 - Melhorias
- [ ] Refatorar server.py em módulos (routers/, models/, services/)

## Arquivos Principais
- `/app/backend/server.py` - Backend completo
- `/app/frontend/src/pages/PerfilPage.js` - Página de perfil
- `/app/frontend/src/contexts/AuthContext.js` - Contexto de autenticação
- `/app/frontend/src/hooks/useWebSocket.js` - Sistema de polling
