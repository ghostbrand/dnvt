# DNVT - Sistema de Gestão de Acidentes de Trânsito

## Visão Geral
Sistema completo para gestão de acidentes de trânsito em Angola, desenvolvido para a Direção Nacional de Viação e Trânsito.

## Problema Statement Original
Sistema com: geração de estatísticas automáticas, Boletim de Ocorrência digital, upload manual, reporte pelo Google Maps, geolocalização em tempo real, mapeamento de zonas críticas, identificação de pontos críticos, assistência em andamento, rotas alternativas, sistema de SMS via Ombala.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB Atlas
- **Frontend Web**: React.js (Create React App)
- **UI**: Shadcn/UI + Tailwind CSS
- **Autenticação**: JWT + Google OAuth (Emergent Auth)
- **Mapas**: Google Maps API
- **SMS**: Ombala API
- **Database**: MongoDB Atlas (dnvt)

## User Personas
1. **Administrador** - Gestão completa do sistema, configurações
2. **Polícia** - Registro oficial de acidentes, gestão de assistências
3. **Cidadão** - Reporte de acidentes (mobile - futuro)

## Core Requirements (Implementados)
✅ Autenticação JWT + Google OAuth
✅ Dashboard com estatísticas em tempo real
✅ CRUD completo de acidentes
✅ Sistema de geolocalização
✅ Mapa interativo com Google Maps
✅ Heatmap de acidentes
✅ Zonas críticas com cálculo automático
✅ Gestão de assistências (Ambulância, Polícia, Bombeiros)
✅ Boletins de ocorrência
✅ Estatísticas por hora, dia, mês
✅ Configurações de integrações (Google Maps, Ombala SMS)
✅ Envio de SMS de teste

## Implementado (06/03/2026)

### Backend (/app/backend/)
- `server.py` - API completa com 30+ endpoints
- Modelos: usuarios, acidentes, boletins, assistencias, zonas_criticas, configuracoes
- Integração Ombala SMS (verificar saldo, enviar SMS)
- Cálculo automático de zonas críticas

### Frontend (/app/frontend/)
- LoginPage - Login/Registro + Google OAuth
- DashboardPage - Estatísticas e gráficos
- MapaPage - Google Maps com markers e heatmap
- AcidentesPage - Lista e gestão de acidentes
- NovoAcidentePage - Formulário de registro
- BoletinsPage - Gestão de boletins
- ZonasCriticasPage - Zonas de risco
- AssistenciasPage - Equipas de socorro
- EstatisticasPage - Relatórios detalhados
- ConfiguracoesPage - API Keys e SMS

## Prioritized Backlog

### P0 - Implementado ✅
- Sistema de autenticação
- Dashboard principal
- Gestão de acidentes
- Mapa interativo

### P1 - Próxima Fase
- App Mobile React Native
- Geração de PDF para boletins
- Exportação Excel dos relatórios
- Alertas em tempo real (WebSocket)
- Notificações push

### P2 - Futuro
- Sistema de rotas alternativas
- Integração com Directions API
- Machine Learning para previsão de acidentes
- Dashboard de métricas avançadas

## Credenciais de Teste
- **Admin**: admin@dnvt.ao / Admin123!
- **MongoDB**: mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt

## URLs
- **Frontend**: https://roadwatch-system-2.preview.emergentagent.com
- **API**: https://roadwatch-system-2.preview.emergentagent.com/api
