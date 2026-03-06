# DNVT - Sistema de Gestão de Acidentes de Trânsito

## Visão Geral
Sistema completo para gestão de acidentes de trânsito em Angola, desenvolvido para a Direção Nacional de Viação e Trânsito.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB Atlas + WebSocket
- **Frontend Web**: React.js (Create React App)
- **Mobile**: React Native (Expo) - estrutura criada
- **UI**: Shadcn/UI + Tailwind CSS
- **Autenticação**: JWT + Google OAuth (Emergent Auth)
- **Mapas**: Google Maps API (configurável)
- **SMS**: Ombala API (configurável)
- **PDF**: ReportLab
- **Database**: MongoDB Atlas (dnvt)

## Implementado (06/03/2026)

### Backend (/app/backend/)
- API completa com 35+ endpoints
- WebSocket para notificações em tempo real
- Geração de PDF para Boletins de Ocorrência
- Integração Ombala SMS
- Cálculo automático de zonas críticas

### Frontend Web (/app/frontend/)
- Dashboard com estatísticas e gráficos
- Mapa interativo com Google Maps
- CRUD de acidentes com geolocalização
- Gestão de boletins com geração de PDF
- Zonas críticas com recomendações
- Gestão de assistências em tempo real
- Configurações de API Keys
- Notificações WebSocket

### Mobile (/app/mobile/) - ESTRUTURA CRIADA
- Estrutura Expo configurada
- Telas: Login, Home, Map, ReportAccident, Alerts, Profile
- Contexto de autenticação
- Serviços de API
- **NOTA**: Requer ambiente Expo separado para build

## Credenciais de Teste
- **Admin**: admin@dnvt.ao / Admin123!
- **MongoDB**: mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt

## Próximos Passos
1. Configurar Google Maps API Key nas configurações
2. Configurar Token Ombala SMS nas configurações
3. Executar `cd /app/mobile && npm install && expo start` para testar mobile

## URLs
- **Frontend**: https://safe-roads-ao.preview.emergentagent.com
- **API**: https://safe-roads-ao.preview.emergentagent.com/api
- **WebSocket**: wss://roadwatch-system-2.preview.emergentagent.com/ws/notifications
